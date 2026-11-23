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
    else {pool.cursor%=pool.capacity;pool.items[pool.cursor].evicted=true;pool.items[pool.cursor]=item;pool.cursor=(pool.cursor+1)%pool.capacity;}
    return item;
  }
  // Generate these masks once. The same textures are instanced with different
  // scale, rotation, tint and age, including on vertical collision surfaces.
  function decalMaterial(kind){
    const tex=document.createElement('canvas');tex.width=tex.height=192;
    const c=tex.getContext('2d');
    let seed=kind==='wall'?9123:kind==='drag'?174:66701;
    function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function spot(x,y,r,aspect=1){
      c.beginPath();c.ellipse(x,y,r*aspect,r,0,0,Math.PI*2);c.fill();
    }
    c.fillStyle='#fff';
    if(kind==='drag'){
      for(let i=0;i<140;i++){
        const y=96+(rnd()-.5)*137,x=16+rnd()*49;
        const len=(1-Math.min(1,Math.abs(96-y)/88))*(43+rnd()*95);
        c.globalAlpha=.28+rnd()*.66;c.lineWidth=.7+rnd()*3.6;
        c.strokeStyle='#fff';c.beginPath();c.moveTo(x,y);
        c.quadraticCurveTo(x+len*.44,y+5*rnd(),x+len,y+(rnd()-.5)*8);c.stroke();
      }
    }else{
      const wall=kind==='wall',cx=94,cy=wall?65:95,count=wall?29:73;
      const phase=rnd()*6;
      c.beginPath();
      for(let i=0;i<=144;i++){
        const a=i/144*Math.PI*2,r=(wall?26:61)*(1+.11*Math.sin(a*3+phase)+.12*Math.sin(a*7)+.05*Math.cos(a*13)+.044*rnd());
        const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a)*.88;
        if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
      }
      c.closePath();c.fill();
      for(let i=0;i<count;i++){
        const a=rnd()*Math.PI*2,r=15+rnd()*(wall?51:67),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.8;
        const size=1+rnd()**2*(wall?8:4);spot(x,y,size,1+rnd()*.6);
        if(wall&&i%4===0){
          const end=Math.min(185,y+20+rnd()*72);
          c.strokeStyle='#fff';c.lineWidth=1+rnd()*2;c.beginPath();c.moveTo(x,y);
          c.bezierCurveTo(x+2,y+9,x-2,end-12,x,end);c.stroke();spot(x,end,1.8);
        }
      }
      if(wall)for(let i=0;i<106;i++){
        const a=rnd()*Math.PI*2,r=34+rnd()*60;c.globalAlpha=.52+rnd()*.46;
        spot(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.65,.6+rnd()*1.5);
      }
    }
    const map=new THREE.CanvasTexture(tex);
    return new THREE.MeshStandardNodeMaterial({color:0xffffff,map,roughness:kind==='drag'?.48:.33,metalness:.04,
      transparent:true,alphaTest:.03,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  }
  const stainGeometry=new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2);
  const walls=pool(new THREE.PlaneGeometry(1,1),48,decalMaterial('wall'));
  const smears=pool(stainGeometry,144,decalMaterial('drag'));
  const droplets=pool(new THREE.IcosahedronGeometry(1,0),760);
  const debris=pool(new THREE.DodecahedronGeometry(1,0),136);
  const stains=pool(stainGeometry,440,decalMaterial('pool'));
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
  const fragmentMaterial=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.68,side:THREE.DoubleSide});
  const rimMaterial=new THREE.MeshStandardNodeMaterial({color:0x7e1a28,roughness:.39});
  const rimGeometry=new THREE.SphereGeometry(1,10,6);
  function releasePart(x,y,z,dx,dz,kind,rig,baseJoint){
    if(level!==2)return;
    let part=separated.find(item=>!item.node.visible);
    if(!part&&separated.length<18){
      const node=new THREE.Group();
      const model=new THREE.Mesh(new THREE.BufferGeometry(),fragmentMaterial),rim=new THREE.Mesh(rimGeometry,rimMaterial);
      node.add(model,rim);root.add(node);part={node,model,rim};separated.push(part);
    }
    if(!part)part=separated.reduce((a,b)=>a.life<b.life?a:b);
    part.model.geometry.dispose();part.model.geometry=rig.fragment(kind,baseJoint);
    const radius=kind==='head'?.065:kind==='leg'?.074:.048;
    part.rim.scale.set(radius,.025,radius*.93);
    part.node.visible=true;part.node.position.set(x,y,z);
    part.node.rotation.set(.25,Math.atan2(dx,dz),.27);
    const mag=Math.hypot(dx,dz)||1;
    Object.assign(part,{vx:2.9*dx/mag+(Math.random()-.5)*2,vy:2.8,vz:2.9*dz/mag+(Math.random()-.5)*2,
      spin:3+Math.random()*5,life:22,rest:false,bounces:0});
  }
  function wound(p,joint){
    if(level!==2)return;
    let w=wounds.find(w=>w.life>0&&w.p===p&&w.joint===joint&&w.generation===p.streetGeneration);
    if(w){w.life=15;return;}
    w=wounds.find(w=>w.life<=0);
    if(!w&&wounds.length<28){w={};wounds.push(w);}
    if(!w)w=wounds.reduce((a,b)=>a.life<b.life?a:b);
    Object.assign(w,{p,joint,life:15,tick:0,pool:null,generation:p.streetGeneration});
  }
  function bleed(w,dt){
    if(w.life<=0)return;
    const p=w.p;
    if((w.life-=dt)<=0||!p.placed||!p.fall||p.streetGeneration!==w.generation){w.life=0;return;}
    const k=w.joint*3,a=p.ragdoll.x,x=a[k],y=a[k+1],z=a[k+2];
    if((w.tick-=dt)>0)return;
    w.tick=.13+Math.random()*.17+(15-w.life)*.018;
    add(droplets,{x,y,z,vx:Math.random()-.5,vy:.2+Math.random()*.6,vz:Math.random()-.5,
      size:.019+Math.random()*.014,angle:0,spin:2,age:0,life:1.7,color:0x861321,landed:false});
    if(y-ground(x,z)>.46)return;
    if(!w.pool||Math.hypot(x-w.pool.x,z-w.pool.z)>.42||w.pool.evicted){
      w.pool=stain(x,z,.24,1.12+Math.random()*.22);
    }else{
      w.pool.size=Math.min(1.22,w.pool.size+.029);w.pool.life=Math.max(w.pool.life,w.pool.age+61);
    }
  }
  const wallHit={};
  function wallSplash(x,y,z,dx,dz,world){
    if(level!==2)return;
    const norm=Math.hypot(dx,dz);if(norm<.01)return;
    dx/=norm;dz/=norm;
    const near=world.nearColliders(x+dx*2.1,z+dz*2.1,5.2);
    for(let t=.18;t<4.8;t+=.16){
      const px=x+dx*t,pz=z+dz*t,py=y+.11*t-.025*t*t;
      for(const col of near){
        if(!world.sphereContact(col,px,py,pz,.14,wallHit))continue;
        const nx=wallHit.nx,nz=wallHit.nz;
        if(!Number.isFinite(nx+nz))continue;
        const offset=wallHit.depth-.14+.019;
        add(walls,{x:px+nx*offset,y:py-.13,z:pz+nz*offset,angle:Math.atan2(nx,nz),
          size:.86+Math.random()*.43+t*.12,age:0,life:89,color:0x89132a});
        return;
      }
    }
  }
  function trail(x1,z1,x2,z2){
    if(level!==2)return;
    const dx=x2-x1,dz=z2-z1,x=(x1+x2)/2,z=(z1+z2)/2;
    add(smears,{x,z,y:ground(x,z)+.032,angle:Math.atan2(-dz,dx),length:Math.hypot(dx,dz)*.96,
      width:.12+Math.random()*.13,age:0,life:66,color:0x741729});
  }
  let level=2;
  function stain(x,z,size,stretch=1,direction=Math.random()*Math.PI*2) {
    return add(stains,{x,y:ground(x,z)+.026+Math.random()*.012,z,size,stretch,
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
    if(group===stains||group===walls||group===smears)tint.multiplyScalar(1-.57*Math.min(1,p.age/39));
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
  return {burst,wound,tire,wallSplash,trail,separate:releasePart,
    setLevel(value){level=value;if(value<2){for(const g of [walls,smears,tread,cloud,debris]){g.items.length=0;g.mesh.count=0;}for(const piece of separated)piece.node.visible=false;for(const w of wounds)w.life=0;}if(!value)for(const group of [stains,droplets,debris]){group.items.length=0;group.mesh.count=0;}},
    update(dt){
      for(const w of wounds)bleed(w,dt);
      render(walls,dt,(p,i)=>write(walls,i,p,p.size,p.size*1.21,1,0,p.angle,0));
      render(smears,dt,(p,i)=>write(smears,i,p,p.length,1,p.width,0,p.angle,0));
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
