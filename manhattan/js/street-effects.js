import * as THREE from 'three/webgpu';

// Recycle world-space effects. Even at the highest setting there are three instanced draws.
export function createImpactEffects(scene, ground) {
  const root = new THREE.Group();
  scene.add(root);
  const transform=new THREE.Object3D(), tint=new THREE.Color();
  function pool(geometry, capacity) {
    const material=new THREE.MeshStandardNodeMaterial({color:0xffffff,roughness:0.79});
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);
    mesh.setColorAt(0,new THREE.Color(0xffffff));
    mesh.count=0;
    mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    return {mesh,capacity,items:[],cursor:0};
  }
  function add(pool, item) {
    if(pool.items.length<pool.capacity) pool.items.push(item);
    else {pool.items[pool.cursor]=item;pool.cursor=(pool.cursor+1)%pool.capacity;}
  }
  const outline=new THREE.Shape();
  for(let i=0;i<=30;i++){
    const a=Math.PI*2*(i%30)/30;
    const radius=.76+.14*Math.sin(a*5+.7)+.12*Math.sin(a*9)+.08*Math.cos(a*13);
    if(!i)outline.moveTo(radius,0);else outline.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
  }
  const stainGeometry=new THREE.ShapeGeometry(outline);
  stainGeometry.rotateX(-Math.PI/2);
  const droplets=pool(new THREE.IcosahedronGeometry(1,0),320);
  const debris=pool(new THREE.DodecahedronGeometry(1,0),88);
  const stains=pool(stainGeometry,220);
  const separated=[];
  const sleeveGeo=new THREE.CapsuleGeometry(.071,.15,3,8);
  const handGeo=new THREE.IcosahedronGeometry(.075,1);
  const edgeGeo=new THREE.CylinderGeometry(.067,.072,.036,8);
  const torn=new THREE.MeshStandardNodeMaterial({color:0x942941,roughness:.8});
  const cloth=new THREE.MeshStandardNodeMaterial({color:0x62232e,roughness:.9});
  const handMat=new THREE.MeshStandardNodeMaterial({color:0xad6558,roughness:.88});
  function releaseSleeve(x,y,z,dx,dz) {
    let part=separated.find(item=>!item.node.visible);
    if(!part&&separated.length<12) {
      const node=new THREE.Group();
      const sleeve=new THREE.Mesh(sleeveGeo,cloth), hand=new THREE.Mesh(handGeo,handMat), edge=new THREE.Mesh(edgeGeo,torn);
      hand.position.y=-.17;hand.scale.set(.83,1.3,.60);edge.position.y=.13;node.add(sleeve,hand,edge);root.add(node);
      part={node};separated.push(part);
    }
    if(!part)part=separated.reduce((a,b)=>a.life<b.life?a:b);
    part.node.visible=true;part.node.position.set(x,y,z);part.node.rotation.set(.4,.7,.8);
    const mag=Math.hypot(dx,dz)||1;
    Object.assign(part,{vx:1.6*dx/mag+(Math.random()-.5)*2,vy:2.3,vz:1.6*dz/mag+(Math.random()-.5)*2,
      spin:3+Math.random()*4,life:13,rest:false});
  }
  let level=2;
  function stain(x,z,size,stretch=1) {
    add(stains,{x,y:ground(x,z)+.026+Math.random()*.012,z,size,stretch,
      angle:Math.random()*Math.PI*2,age:0,life:level===2?47:19,color:Math.random()>.45?0x741020:0x9e1826});
  }
  function burst(x,y,z,dx,dz,strong) {
    if(level===0)return;
    const many=level===2, amount=many?(strong?66:40):12;
    const magnitude=Math.hypot(dx,dz)||1;
    for(let i=0;i<amount;i++){
      const a=Math.random()*Math.PI*2, speed=(many?5.5:2.3)*Math.random();
      const piece=many&&i%7===0;
      const vx=Math.cos(a)*speed+dx/magnitude*(strong?2.1:1.1), vz=Math.sin(a)*speed+dz/magnitude*(strong?2.1:1.1);
      add(piece?debris:droplets,{x,y:y+Math.random()*.22,z,vx,vy:1.2+Math.random()*(many?4.8:2.8),vz,
        size:(piece?.11:.042)*(1+Math.random()*1.25),angle:a,spin:Math.random()*8-4,landed:false,
        age:0,life:piece?7:1.9,color:piece?(i%2?0x8f2437:0xb84651):(i%3?0xb7192b:0x770720)});
    }
    stain(x,z,many?(strong?1.35:.85):.37);
    if(many)for(let i=0;i<12;i++){
      const a=Math.random()*Math.PI*2,r=Math.random()*(strong?2.6:1.7);
      stain(x+Math.cos(a)*r,z+Math.sin(a)*r,.08+Math.random()*.24,1.1+Math.random());
    }
  }
  function write(group,index,p,sx,sy,sz,rx,ry,rz) {
    transform.position.set(p.x,p.y,p.z);transform.rotation.set(rx,ry,rz);transform.scale.set(sx,sy,sz);
    transform.updateMatrix();group.mesh.setMatrixAt(index,transform.matrix);
    tint.setHex(p.color);group.mesh.setColorAt(index,tint);
  }
  function render(group, dt, draw) {
    let n=0;
    for(const p of group.items){
      p.age+=dt;if(p.age>=p.life)continue;
      draw(p,n,dt);
      group.items[n++]=p;
    }
    const changed=n||group.mesh.count;
    group.items.length=n;group.mesh.count=n;
    if(changed){group.mesh.instanceMatrix.needsUpdate=true;if(group.mesh.instanceColor)group.mesh.instanceColor.needsUpdate=true;}
  }
  function move(group,p,index,dt) {
    if(!p.landed){
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.vy-=12.5*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
      const floor=ground(p.x,p.z);
      if(p.y<=floor+p.size*.32){
        p.landed=true;p.y=floor+p.size*.32;
        if(group===droplets){p.life=p.age+.03;if(level===2&&Math.random()<.16)stain(p.x,p.z,.10+Math.random()*.16);}
      }
    }
    const size=p.size*Math.min(1,(p.life-p.age)*3);
    write(group,index,p,size,size*(group===debris?.72:1.65),size*.8,p.angle,p.angle*.7,0);
  }
  return {burst,separate:releaseSleeve,trail(x,z){if(level===2)stain(x,z,.2+Math.random()*.22,1.7);},
    setLevel(value){level=value;if(value<2)for(const piece of separated)piece.node.visible=false;if(!value)for(const group of [stains,droplets,debris]){group.items.length=0;group.mesh.count=0;}},
    update(dt){
      render(droplets,dt,(p,i,d)=>move(droplets,p,i,d));
      render(debris,dt,(p,i,d)=>move(debris,p,i,d));
      render(stains,dt,(p,i)=>{const k=p.size*Math.min(1,.46+p.age*2.2,(p.life-p.age)*.6);
        write(stains,i,p,k*p.stretch,1,k,0,p.angle,0);});
      for(const part of separated){
        if(!part.node.visible)continue;
        part.life-=dt;if(part.life<=0){part.node.visible=false;continue;}
        if(part.rest)continue;
        const pos=part.node.position;
        pos.x+=dt*part.vx;pos.z+=dt*part.vz;pos.y+=dt*part.vy;part.vy-=dt*12.5;
        part.node.rotation.x+=part.spin*dt;part.node.rotation.z+=part.spin*.54*dt;
        const floor=ground(pos.x,pos.z)+.074;
        if(pos.y<=floor){pos.y=floor;part.node.rotation.z=Math.PI/2;part.rest=true;}
      }
      root.updateMatrixWorld();
    }
  };
}
