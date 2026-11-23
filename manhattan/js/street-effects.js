import * as THREE from 'three/webgpu';

// Pool transient effects. Particle count does not add draw calls within a pool.
export function createImpactEffects(scene, ground, camera) {
  const root = new THREE.Group();
  scene.add(root);
  const transform=new THREE.Object3D(), tint=new THREE.Color();
  function pool(geometry, capacity, custom=null) {
    const material=custom||new THREE.MeshStandardNodeMaterial({color:0xffffff,roughness:0.79});
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
  const droplets=pool(new THREE.IcosahedronGeometry(1,0),760);
  const debris=pool(new THREE.DodecahedronGeometry(1,0),136);
  const stains=pool(stainGeometry,440,new THREE.MeshStandardNodeMaterial({color:0xffffff,roughness:.34,metalness:.04}));
  // A soft, short-lived spray sits behind the heavier ballistic drops.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,31);
  gradient.addColorStop(0,'rgba(255,255,255,.60)');gradient.addColorStop(.42,'rgba(255,255,255,.38)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const pixels=ctx.getImageData(0,0,64,64);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const i=(y*64+x)*4+3,grain=.80+.15*Math.sin(x*.53+Math.sin(y*.38)*2)*Math.sin(y*.44)+Math.random()*.10;
    pixels.data[i]=Math.round(pixels.data[i]*grain);
  }
  ctx.putImageData(pixels,0,0);
  const cloud=pool(new THREE.PlaneGeometry(1,1),64,new THREE.MeshBasicNodeMaterial({
    map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.74,side:THREE.DoubleSide
  }));
  const tread=pool(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),300,new THREE.MeshStandardNodeMaterial({roughness:.47}));
  function tire(x,z,yaw,wetness){
    if(level!==2)return;
    const sideX=Math.cos(yaw),sideZ=-Math.sin(yaw);
    for(let i=-1;i<=1;i++){
      const d=i*.052;
      add(tread,{x:x+sideX*d,z:z+sideZ*d,y:ground(x,z)+.029,angle:yaw+i*.19,size:.028+wetness*.026,
        color:wetness>.5?0x721321:0x4b1822,age:0,life:40+wetness*26});
    }
  }
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
    Object.assign(w,{p,joint,life:12,tick:0,instance:p.streetGeneration||0});
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
    w.tick=.11+Math.random()*.22;
    add(droplets,{x,y,z,vx:Math.random()-.5,vy:.4+Math.random()*.5,vz:Math.random()-.5,
      size:.027,angle:0,spin:2,age:0,life:1.7,color:0x861321,landed:false});
    if(y-ground(x,z)<.52)stain(x+(Math.random()-.5)*.2,z+(Math.random()-.5)*.2,.16+(12-w.life)*.057,1.18);
  }
  let level=2;
  function stain(x,z,size,stretch=1,direction=Math.random()*Math.PI*2) {
    add(stains,{x,y:ground(x,z)+.026+Math.random()*.012,z,size,stretch,
      angle:direction,age:0,life:level===2?77:19,color:Math.random()>.45?0x741020:0x9e1826});
  }
  function burst(x,y,z,dx,dz,strong) {
    if(level===0)return;
    const many=level===2, amount=many?(strong?152:64):12;
    if(many){
      const heading=Math.atan2(dx,dz),n=strong?8:3;
      for(let i=0;i<n;i++){
        const a=heading+(Math.random()-.5)*1.65,speed=1.2+Math.random()*3.5;
        add(cloud,{x,y,z,vx:Math.sin(a)*speed,vz:Math.cos(a)*speed,vy:.5+Math.random()*1.1,
          age:0,life:.27+Math.random()*.35,size:.35+Math.random()*.47,color:i%2?0xa71b30:0x720a20});
      }
    }
    const magnitude=Math.hypot(dx,dz)||1;
    for(let i=0;i<amount;i++){
      const a=i%3?Math.atan2(dz,dx)+(Math.random()-.5)*(many?1.7:2.7):Math.random()*Math.PI*2;
      const speed=(many?7.3:2.3)*Math.random();
      const piece=many&&strong&&i%19===0;
      const vx=Math.cos(a)*speed+dx/magnitude*(strong?2.1:1.1), vz=Math.sin(a)*speed+dz/magnitude*(strong?2.1:1.1);
      add(piece?debris:droplets,{x,y:y+Math.random()*.22,z,vx,vy:1.2+Math.random()*(many?4.8:2.8),vz,
        size:piece?.038+Math.random()*.042:.008+Math.random()**1.7*.031,angle:a,spin:Math.random()*8-4,landed:false,
        age:0,life:piece?7:1.9,color:piece?(i%2?0x651820:0x84252b):(i%3?0x961526:0x690e19)});
    }
    // Immediate transfer is small. Airborne drops seed the footprint as they actually land.
    stain(x,z,many?(strong?.56:.29):.17,1.2,Math.atan2(-dz,dx));
  }
  function write(group,index,p,sx,sy,sz,rx,ry,rz) {
    transform.position.set(p.x,p.y,p.z);transform.rotation.set(rx,ry,rz);transform.scale.set(sx,sy,sz);
    transform.updateMatrix();group.mesh.setMatrixAt(index,transform.matrix);
    tint.setHex(p.color);
    if(group===stains)tint.multiplyScalar(1-.57*Math.min(1,p.age/39));
    group.mesh.setColorAt(index,tint);
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
        if(group===droplets){
          p.life=p.age+.03;
          if(level===2&&Math.random()<.55){
            const horizontal=Math.hypot(p.vx,p.vz),oblique=Math.min(2,horizontal/Math.max(1,Math.abs(p.vy)));
            stain(p.x,p.z,.033+p.size*2.35,1+oblique,Math.atan2(-p.vz,p.vx));
          }
        }
      }
    }
    const size=p.size*Math.min(1,(p.life-p.age)*3);
    if(group===droplets){
      // Carry the long axis along the velocity as the trajectory bends toward the ground.
      const horizontal=Math.hypot(p.vx,p.vz),speed=Math.hypot(horizontal,p.vy);
      transform.position.set(p.x,p.y,p.z);
      transform.rotation.set(Math.atan2(horizontal,p.vy),Math.atan2(p.vx,p.vz),0,'YXZ');
      transform.scale.set(size*.75,size*(1+Math.min(2.8,speed*.31)),size*.75);
      transform.updateMatrix();group.mesh.setMatrixAt(index,transform.matrix);
      tint.setHex(p.color);group.mesh.setColorAt(index,tint);
    }else write(group,index,p,size,size*.64,size*.69,p.angle,p.angle*.7,0);
  }
  return {burst,wound,tire,separate:releasePart,trail(x,z){if(level===2)stain(x,z,.2+Math.random()*.22,1.7);},
    setLevel(value){level=value;if(value<2){for(const g of [tread,cloud,debris]){g.items.length=0;g.mesh.count=0;}for(const piece of separated)piece.node.visible=false;for(const w of wounds)w.mesh.visible=false;}if(!value)for(const group of [stains,droplets,debris]){group.items.length=0;group.mesh.count=0;}},
    update(dt){
      for(const w of wounds)bleed(w,dt);
      render(tread,dt,(p,i)=>write(tread,i,p,p.size,1,.16*Math.min(1,p.life-p.age),0,p.angle,0));
      render(cloud,dt,(p,i)=>{
        p.x+=dt*p.vx;p.y+=dt*p.vy;p.z+=dt*p.vz;
        const age=p.age/p.life,scale=p.size*(.6+age*2)*(1-age);
        transform.position.set(p.x,p.y,p.z);transform.quaternion.copy(camera.quaternion);
        transform.scale.set(scale*1.5,scale,1);transform.updateMatrix();cloud.mesh.setMatrixAt(i,transform.matrix);
        tint.setHex(p.color);cloud.mesh.setColorAt(i,tint);
      });
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
