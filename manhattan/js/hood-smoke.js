import * as THREE from 'three/webgpu';

export function createHoodSmoke(scene,camera){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,31);
  grad.addColorStop(0,'rgba(255,255,255,.48)');grad.addColorStop(.55,'rgba(255,255,255,.24)');grad.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
  const material=new THREE.MeshBasicNodeMaterial({color:0xb4b2ad,map:new THREE.CanvasTexture(canvas),depthWrite:false,transparent:true});
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,72);
  mesh.count=0;mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  const puffs=[],dummy=new THREE.Object3D();let next=0;
  return function update(dt,traffic,taxi){
    if(!dt)return;
    if((next-=dt)<=0){
      next=.16;
      function emit(v){
        const damage=v.crush;if(!damage||Math.max(damage[0],damage[1])<.57)return;
        const x=v.position?.x??v.x,z=v.position?.z??v.z,yaw=v.heading??(v.yaw+v.yawOffset);
        if(Math.hypot(camera.position.x-x,camera.position.z-z)>50||puffs.length>=72)return;
        const side=damage[0]>damage[1]?.38:-.38;
        puffs.push({x:x+Math.sin(yaw)*1.35+Math.cos(yaw)*side,z:z+Math.cos(yaw)*1.35-Math.sin(yaw)*side,
          y:(v.position?.y??v.streetY??0)+1.02,age:0,dx:.24+Math.random()*.42,dz:Math.random()*.4-.2,
          life:1.2+Math.random()*.8,size:.30+Math.random()*.32});
      }
      emit(taxi);for(const v of traffic.cars)if(v.edge||v.streetHeld)emit(v);
    }
    let n=0;
    for(const p of puffs){
      if((p.age+=dt)>=p.life)continue;
      p.x+=p.dx*dt;p.z+=p.dz*dt;p.y+=dt*(.74+.31*p.age);
      const f=p.age/p.life,k=p.size*(.52+1.85*f)*Math.min(1,(1-f)*4);
      dummy.position.set(p.x,p.y,p.z);dummy.quaternion.copy(camera.quaternion);dummy.scale.set(k,k,1);
      dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);puffs[n++]=p;
    }
    puffs.length=n;mesh.count=n;mesh.visible=n>0;if(n)mesh.instanceMatrix.needsUpdate=true;
  };
}