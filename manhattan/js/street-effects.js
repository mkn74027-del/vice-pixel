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
  const separated=[], wounds=[];
  const wet=new THREE.MeshStandardNodeMaterial({color:0x791c26,roughness:.38});
  const edgeMat=new THREE.MeshStandardNodeMaterial({color:0x933040,roughness:.55});
  const skin=new THREE.MeshStandardNodeMaterial({color:0xa86c57,roughness:.8});
  const fabric=new THREE.MeshStandardNodeMaterial({color:0x38404b,roughness:.95});
  const sole=new THREE.MeshStandardNodeMaterial({color:0x24252a,roughness:.95});
  const round=new THREE.IcosahedronGeometry(1,1), tube=new THREE.CylinderGeometry(1,1,1,9);
  function segment(group,geometry,material,y,sx,sy,sz,z=0){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(0,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);
  }
  function buildPart(kind){
    const g=new THREE.Group();
    if(kind==='head'){
      segment(g,round,skin,0,.104,.133,.109);
      segment(g,round,sole,.075,.108,.072,.115);
      segment(g,round,skin,-.008,.031,.031,.034,.098);
      segment(g,tube,edgeMat,-.12,.056,.045,.05);
    }else if(kind==='leg'){
      segment(g,round,fabric,-.03,.087,.215,.085);
      segment(g,round,sole,-.21,.083,.065,.145,.044);
      segment(g,tube,edgeMat,.144,.071,.048,.064);
    }else{
      segment(g,round,skin,-.034,.059,.142,.055);
      segment(g,round,fabric,.063,.07,.079,.066);
      segment(g,round,skin,-.18,.055,.081,.037);
      segment(g,tube,edgeMat,.121,.055,.039,.052);
    }
    return g;
  }
  function releasePart(x,y,z,dx,dz,kind='arm'){
    if(level!==2)return;
    let part=separated.find(item=>!item.node.visible);
    if(!part&&separated.length<18){
      const node=new THREE.Group(),shapes={};
      for(const name of ['arm','leg','head']){shapes[name]=buildPart(name);node.add(shapes[name]);}
      root.add(node);part={node,shapes};separated.push(part);
    }
    if(!part)part=separated.reduce((a,b)=>a.life<b.life?a:b);
    for(const name of Object.keys(part.shapes))part.shapes[name].visible=name===kind;
    part.node.visible=true;part.node.position.set(x,y,z);part.node.rotation.set(.4,.7,.8);
    const mag=Math.hypot(dx,dz)||1;
    Object.assign(part,{vx:2.9*dx/mag+(Math.random()-.5)*2,vy:2.8,vz:2.9*dz/mag+(Math.random()-.5)*2,
      spin:3+Math.random()*5,life:22,rest:false,bounces:0});
  }
  function wound(p,joint){
    if(level!==2)return;
    let w=wounds.find(w=>!w.mesh.visible);
    if(!w&&wounds.length<28){
      const mesh=new THREE.Mesh(round,wet);root.add(mesh);w={mesh};wounds.push(w);
    }
    if(!w)w=wounds.reduce((a,b)=>a.life<b.life?a:b);
    Object.assign(w,{p,joint,life:8,tick:0,instance:p.streetGeneration||0});
    w.mesh.visible=true;w.mesh.scale.set(.082,.099,.077);
  }
  function bleed(w,dt){
    const p=w.p;
    if(!w.mesh.visible)return;
    if((w.life-=dt)<=0||!p.placed||!p.fall||p.streetGeneration!==w.instance){
      w.mesh.visible=false;return;
    }
    const a=p.ragdoll.x,k=w.joint*3,x=a[k],y=a[k+1],z=a[k+2];
    w.mesh.position.set(x,y,z);
    if((w.tick-=dt)>0)return;
    w.tick=.17+Math.random()*.23;
    add(droplets,{x,y,z,vx:Math.random()-.5,vy:.4+Math.random()*.5,vz:Math.random()-.5,
      size:.027,angle:0,spin:2,age:0,life:1.7,color:0x861321,landed:false});
    if(y-ground(x,z)<.52)stain(x+(Math.random()-.5)*.2,z+(Math.random()-.5)*.2,.16+(8-w.life)*.055,1.18);
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
  return {burst,wound,separate:releasePart,trail(x,z){if(level===2)stain(x,z,.2+Math.random()*.22,1.7);},
    setLevel(value){level=value;if(value<2){for(const piece of separated)piece.node.visible=false;for(const w of wounds)w.mesh.visible=false;}if(!value)for(const group of [stains,droplets,debris]){group.items.length=0;group.mesh.count=0;}},
    update(dt){
      for(const w of wounds)bleed(w,dt);
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
        const floor=ground(pos.x,pos.z)+.09;
        if(pos.y<=floor){
          pos.y=floor;stain(pos.x,pos.z,.19+.05*part.bounces,1.45);
          if(part.bounces<2&&Math.abs(part.vy)>.65){
            part.vy=Math.abs(part.vy)*.38;part.vx*=.53;part.vz*=.53;part.spin*=.64;part.bounces++;
          }else{part.node.rotation.z=Math.PI/2;part.rest=true;}
        }
      }
      root.updateMatrixWorld();
    }
  };
}
