import {applyImpact,vehicleRay} from './car-damage.js';
import * as THREE from 'three/webgpu';
import { RAGDOLL_POINTS } from './ragdoll.js';
import { createImpactEffects } from './street-effects.js?v=motion72';

const gear=[
  {name:'Fäuste',mag:0,interval:.44},
  {name:'Arcade-Pistole',mag:12,interval:.26},
  {name:'Impuls-MP',mag:24,interval:.13}
];
export function createStreetPlay({law,scene,manager,cameraSystem,traffic,audio,map,canvas,selectMode}) {
  const ground=(x,z)=>manager.getGroundHeight(x,z,'person');
  const effects=createImpactEffects(scene,ground,cameraSystem.camera);
  const nativeTaxi=manager.entities.car, tires=new Map();
  const panel=document.getElementById('street-menu'), menuButton=document.getElementById('street-menu-button');
  const readout=document.getElementById('street-gear'), cross=document.getElementById('street-reticle');
  const blood=document.getElementById('street-blood'), message=document.getElementById('street-notice');
  const locks=()=>document.pointerLockElement===canvas;
  const person=manager.entities.person;
  const ready=()=>manager.activeMode==='person'&&!map.isFullMapOpen&&!panel.open&&!manager.inputBlocked&&!person.streetPull&&!person.playerFall&&!(person.streetStun>0)&&audio.ready&&!document.querySelector('.vice-missions.jobs-open')&&cameraSystem.getActivePreset().category==='follow';
  const eyeRay=new THREE.Raycaster(), pointer=new THREE.Vector2(), impact=new THREE.Vector3();
  const muzzle=new THREE.Vector3(), aim=new THREE.Vector3(), lineDir=new THREE.Vector3();
  const handPoints=new Float32Array(51), touch={};
  const impacted=new WeakMap(), trails=[],shotPose=new Float64Array(51);
  const J=RAGDOLL_POINTS;
  const zones=[
    {joint:J.HEAD,r:.175,kind:'head',mask:1<<2,base:J.NECK},
    {joint:J.ELBOW_L,r:.15,kind:'arm',mask:1<<4,base:J.ELBOW_L},
    {joint:J.WRIST_L,r:.13,kind:'arm',mask:1<<4,base:J.ELBOW_L},
    {joint:J.ELBOW_R,r:.15,kind:'arm',mask:1<<6,base:J.ELBOW_R},
    {joint:J.WRIST_R,r:.13,kind:'arm',mask:1<<6,base:J.ELBOW_R},
    {joint:J.KNEE_L,r:.17,kind:'leg',mask:7<<8,base:J.KNEE_L},
    {joint:J.ANKLE_L,r:.15,kind:'leg',mask:7<<8,base:J.KNEE_L},
    {joint:J.KNEE_R,r:.17,kind:'leg',mask:7<<12,base:J.KNEE_R},
    {joint:J.ANKLE_R,r:.15,kind:'leg',mask:7<<12,base:J.KNEE_R},
    ...[J.SPINE,J.NECK,J.HIP_L,J.HIP_R,J.SHOULDER_L,J.SHOULDER_R].map(joint=>({joint,r:.185,mask:0,base:joint}))
  ];
  let clock=0, index=0, ammo=[0,12,24], cooldown=0, reload=0, punch=0, punchSide=1, pendingPunch=false;
  let firing=false, noticeTime=0, flashTime=0, lastLabel='', lastHitFlash=0;
  let attacks=0, hits=0, screams=0;
  const gun=new THREE.Group(), tracer=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicNodeMaterial({color:0xffdc81}));
  const metal=new THREE.MeshStandardNodeMaterial({color:0x34414d,roughness:.42,metalness:.35});
  const gripMat=new THREE.MeshStandardNodeMaterial({color:0x352d33,roughness:.9});
  const part=(x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);gun.add(mesh);return mesh;};
  const body=part(0,.045,.075,.095,.105,.285,metal);
  part(0,-.04,-.007,.084,.135,.084,gripMat);
  const stock=part(0,.022,-.17,.075,.075,.22,gripMat);
  gun.visible=tracer.visible=false;scene.add(gun,tracer);
  const zAxis=new THREE.Vector3(0,0,1);
  let inputActive = false;
  function say(text){message.textContent=text;message.hidden=false;noticeTime=2.1;}
  function refresh(){
    const label=gear[index].name+(index?' · '+(reload?'Lädt …':ammo[index]+' / '+gear[index].mag):'');
    if(label!==lastLabel){readout.textContent=label;lastLabel=label;}
    document.body.classList.toggle('street-locked',locks());
    cross.hidden=!(manager.activeMode==='person'&&index>0&&locks()&&!panel.open&&!map.isFullMapOpen);
  }
  function stopInput(){
    firing=false;pendingPunch=false;punch=0;manager.aiming=false;manager.resetInput();
    if(locks())document.exitPointerLock();
  }
  function menu(open){
    if(open){
      const car=manager.entities.car,inspection=document.getElementById('garage-inspection');
      inspection.hidden=manager.activeMode!=='car';
      const dents=(car.trafficCar||car).crush;
      const pct=(...i)=>Math.round(100*Math.max(...i.map(k=>dents?.[k]||0)));
      inspection.textContent='Karosserieschaden · Front '+pct(0,1)+' % · Heck '+pct(2,3)+' % · Seiten '+pct(4,5)+' %';
      if(map.isFullMapOpen)map.toggleFullMap(false);stopInput();panel.showModal();manager.inputBlocked=true;}
    else if(panel.open)panel.close();
  }
  panel.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();menu(false);}
    e.stopPropagation();
  });
  panel.addEventListener('close',()=>{manager.inputBlocked=map.isFullMapOpen;manager.resetInput();menuButton.blur();});
  menuButton.addEventListener('click',()=>menu(true));
  panel.querySelector('[data-close]').addEventListener('click',()=>menu(false));
  panel.addEventListener('click',e=>{
    const action=e.target.closest('[data-play-action]')?.dataset.playAction;
    if(!action)return;
    menu(false);
    if(action==='map'){map.toggleFullMap(true);return;}
    if(action==='jobs'){document.querySelector('.vice-toggle').click();return;}
    if(action==='camera'){document.getElementById('cam-next').click();return;}
    if(action==='sound'){document.getElementById('btn-sound').click();return;}
    if(action==='hud'){document.body.classList.toggle('street-full');return;}
    selectMode(action);
  });
  blood.addEventListener('change',()=>{
    const level=Number(blood.value);effects.setLevel(level);
    if(level<2){tires.clear();for(const p of traffic.streetTargets){p.rig.streetWounds=0;p.rig.hitMarks=null;p.rig.markCursor=0;p.zoneTrauma=null;}}
  });
  document.getElementById('street-look').addEventListener('click',()=>{
    menu(false);selectMode('person');
    try{const result=canvas.requestPointerLock?.();result?.catch(()=>say('Rechte Maustaste ziehen zum Umschauen.'));}
    catch{say('Rechte Maustaste ziehen zum Umschauen.');}
  });
  function equip(next){
    index=next;reload=0;firing=false;pendingPunch=false;punch=0;cooldown=.10;
    stock.visible=index===2;body.scale.z=index===2?1.5:1;
    document.getElementById('street-loadout').value=String(index);refresh();
  }
  document.getElementById('street-loadout').addEventListener('change',e=>equip(Number(e.target.value)));
  function recharge(){
    if(index && !reload && ammo[index]<gear[index].mag){reload=index===1?.85:1.15;firing=false;refresh();}
  }
  function react(p,x,y,z,dx,dz,heavy,zone,contact=false,severity=1){
    const last=impacted.get(p);
    const recent=last?.generation===p.streetGeneration&&clock-last.at<.80;
    if(contact&&recent)return;
    if(!recent)impacted.set(p,{at:clock,generation:p.streetGeneration});
    effects.burst(x,y,z,dx,dz,heavy);
    if(heavy&&blood.value==='2')effects.wallSplash(x,y,z,dx,dz,manager);
    if(heavy&&blood.value==='2'&&p.ragdoll&&zone){
      const j=zone.base*3,pos=p.ragdoll.x;
      p.rig.markContact(zone.joint,x,y,z,contact?.27:.21);
      effects.wound(p,zone.base);
      const damage=p.zoneTrauma||(p.zoneTrauma=new Float32Array(17));
      const group=zone.base;
      damage[group]+=severity;
      if(zone.mask&&damage[group]>=1.5&&!(p.rig.streetWounds&zone.mask)){
        p.rig.streetWounds=(p.rig.streetWounds||0)|zone.mask;
        effects.separate(pos[j],pos[j+1],pos[j+2],dx,dz,zone.kind,p.rig,zone.base);
        if(zone.kind==='head'||zone.kind==='leg')p.streetInjury=1;
      }
    }
    if(!recent&&audio.streetSound('cry',x,y,z))screams++;
    if(recent)return;
    if(trails.length>=16)trails.shift();
    trails.push({p,x,z,generation:p.streetGeneration,until:clock+7});
  }
  traffic.setPersonImpactFeedback((p,m,joint,wheel)=>{
    const speed=Math.hypot(m.vx,m.vz),pose=p.ragdoll?.x;
    let zone=zones[9],best=Infinity;
    if(pose)for(const candidate of zones){
      const k=candidate.joint*3;
      const d=(pose[k]-m.x)**2+(pose[k+1]-(m.y+.58))**2+(pose[k+2]-m.z)**2;
      if(d<best){zone=candidate;best=d;}
    }
    if(joint!==undefined&&joint>=0)zone=zones.find(z=>z.joint===joint)||zone;
    if(m.ref===manager.getActiveEntity()&&speed>3.8)law.report('vehicleHit',speed>9?32:18,1.35);
    if(wheel&&speed>2.7&&blood.value==='2'){
      const v=m.ref?.trafficCar||m.ref;
      if(v){const side=(p.x-m.x)*Math.cos(m.heading)-(p.z-m.z)*Math.sin(m.heading);
        tires.set(v,{x:m.x,z:m.z,side:side<0?-1:1,left:15,until:clock+30});}
    }
    const k=zone.joint*3;
    react(p,pose?.[k]??p.x,pose?.[k+1]??ground(p.x,p.z)+.8,pose?.[k+2]??p.z,m.vx,m.vz,speed>5,zone,true,wheel?1.8:Math.min(2.2,speed/8));
  });
  function unobstructed(origin,dir,range){
    const endX=origin.x+dir.x*range,endZ=origin.z+dir.z*range;
    const near=manager.nearColliders((origin.x+endX)*.5,(origin.z+endZ)*.5,range*.5+1);
    const loX=Math.min(origin.x,endX)-.2,hiX=Math.max(origin.x,endX)+.2;
    const loZ=Math.min(origin.z,endZ)-.2,hiZ=Math.max(origin.z,endZ)+.2;
    const solids=near.filter(c=>c.maxX>=loX&&c.minX<=hiX&&c.maxZ>=loZ&&c.minZ<=hiZ);
    for(let t=.16;t<range;t+=.28){
      const x=origin.x+dir.x*t,y=origin.y+dir.y*t,z=origin.z+dir.z*t;
      if(y<ground(x,z)||solids.some(c=>manager.sphereContact(c,x,y,z,.145,touch)))return t;
    }
    return range;
  }
  function down(p,dir,heavy=true,zone=null,point=null){
    if(!p.fall){if(!traffic.arcadeHit(p,dir.x,dir.z))return;}
    else if(heavy&&p.ragdoll&&p.fall.mode==='tumble'){p.ragdoll.wake();p.ragdoll.kick(dir.x,dir.z,1.6);}
    else return;
    hits++;lastHitFlash=.18;law.report(heavy?'shotHit':'fight',heavy?24:16,.75);
    react(p,point?.x??p.x,point?.y??ground(p.x,p.z)+.92,point?.z??p.z,dir.x,dir.z,heavy,zone);
  }
  function swing(){
    let nearest=2.05,target=null;
    const sx=Math.sin(cameraSystem.walkYaw),sz=Math.cos(cameraSystem.walkYaw);
    for(const p of traffic.streetTargets){
      if(!p.placed||p.fall||!p.rig.placed)continue;
      const dx=p.x-person.position.x,dz=p.z-person.position.z,d=Math.hypot(dx,dz);
      if(d>=nearest||d<.01||(dx*sx+dz*sz)/d<.38)continue;
      if(Math.abs(ground(p.x,p.z)-person.position.y)>1.3)continue;
      aim.set(dx/d,0,dz/d);muzzle.copy(person.position);muzzle.y+=1;
      if(unobstructed(muzzle,aim,d)<d)continue;
      target=p;nearest=d;
    }
    if(target)down(target,{x:sx,z:sz},false);
  }
  function fire(){
    if(!ready()||cooldown>0||reload)return;
    if(!index){
      punch=.38;punchSide=1-punchSide;pendingPunch=true;cooldown=gear[0].interval;attacks++;
      return;
    }
    if(ammo[index]===0){recharge();return;}
    ammo[index]--;cooldown=gear[index].interval;attacks++;
    eyeRay.setFromCamera(locks()?pointer.set(0,0):pointer,cameraSystem.camera);
    const ray=eyeRay.ray;
    const range=58;let best=unobstructed(ray.origin,ray.direction,range),target=null,hitZone=null;
    for(const p of traffic.streetTargets){
      if(!p.placed||!p.rig.placed||p.phase==='pull')continue;
      if(Math.abs(p.x-ray.origin.x)>range+2||Math.abs(p.z-ray.origin.z)>range+2)continue;
      const floor=ground(p.x,p.z);
      impact.set(p.x,floor+.88,p.z);
      if(ray.distanceSqToPoint(impact)>6.25)continue;
      let pose;
      if(p.fall?.mode==='tumble')pose=p.ragdoll.x;
      else {p.rig.ragdollPoints(shotPose);pose=shotPose;}
      for(const z of zones){
        if(z.mask&&(p.rig.streetWounds&z.mask))continue;
        impact.fromArray(pose,z.joint*3);
        const along=aim.subVectors(impact,ray.origin).dot(ray.direction);
        if(along<=0||along>best+.45)continue;
        const radius=z.r+Math.min(.13,along*.0025),d2=ray.distanceSqToPoint(impact);
        if(d2>radius*radius)continue;
        const entry=along-Math.sqrt(radius*radius-d2);
        if(entry>=best)continue;
        best=entry;target=p;hitZone=z;
      }
    }
    let vehicle=null;
    for(const v of [nativeTaxi,...traffic.cars]){
      if(v!==nativeTaxi&&!v.edge&&!v.streetHeld)continue;
      const t=vehicleRay(v,ray,best);
      if(t<best){best=t;target=null;vehicle=v;}
    }
    ray.at(best,impact);
    muzzle.copy(person.position);muzzle.y+=1.25;
    aim.subVectors(impact,muzzle);const length=aim.length();aim.normalize();
    const cutoff=unobstructed(muzzle,aim,length);
    if(cutoff<length-.30){target=null;vehicle=null;impact.copy(muzzle).addScaledVector(aim,cutoff);}
    if(vehicle)applyImpact(vehicle,impact.x,impact.z,6,true);
    law.report('gunfire',14,1.3);
    if(target)down(target,ray.direction,true,hitZone,impact);
    person.heading=Math.atan2(aim.x,aim.z);
    audio.streetSound('shot',muzzle.x,muzzle.y,muzzle.z,index-1);
    tracer.position.addVectors(muzzle,impact).multiplyScalar(.5);
    lineDir.subVectors(impact,muzzle);
    tracer.scale.set(.022,.022,Math.max(.01,lineDir.length()));
    tracer.quaternion.setFromUnitVectors(zAxis,lineDir.normalize());tracer.visible=true;flashTime=.065;
    tracer.updateMatrixWorld();refresh();
  }
  function screenPoint(e){
    if(locks()){pointer.set(0,0);return;}
    const rect=canvas.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.pointerType==='touch'||!ready())return;
    screenPoint(e);firing=true;fire();
  });
  canvas.addEventListener('pointermove',e=>{if(firing&&!locks())screenPoint(e);});
  window.addEventListener('pointerup',()=>{firing=false;});
  window.addEventListener('blur',stopInput);
  document.addEventListener('pointerlockchange',()=>{firing=false;refresh();});
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;
    if(e.code==='Escape'&&panel.open){menu(false);return;}
    if(e.code==='Tab'&&(!panel.open||e.target===document.body)){e.preventDefault();if(!e.repeat&&!map.isFullMapOpen)menu(!panel.open);return;}
    if(/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName)||panel.open||map.isFullMapOpen||e.repeat)return;
    if(e.code==='KeyQ'&&ready()){e.preventDefault();equip((index+1)%gear.length);}
    if(e.code==='KeyR'&&ready())recharge();
    if(e.code==='KeyG'&&ready()&&!cooldown){punch=.38;punchSide=1-punchSide;pendingPunch=true;cooldown=.44;attacks++;}
    if(e.code==='KeyK'&&ready()){pointer.set(0,0);fire();}
  });
  document.body.classList.add('street-ready');
  refresh();
  return {get menuOpen(){return panel.open;}, stopInput,
    update(dt){
      clock+=dt;
      const active=manager.activeMode==='person'&&!person.playerFall;
      if (inputActive && !active) { firing=false; punch=0; pendingPunch=false; }
      inputActive=active;
      if(!active||panel.open||map.isFullMapOpen){firing=false;pendingPunch=false;}
      cooldown=Math.max(0,cooldown-dt);flashTime=Math.max(0,flashTime-dt);
      tracer.visible=flashTime>0;
      if(reload>0){reload=Math.max(0,reload-dt);if(!reload){ammo[index]=gear[index].mag;refresh();}}
      if(punch>0){punch=Math.max(0,punch-dt);if(pendingPunch&&punch<.24&&active){pendingPunch=false;swing();}}
      if(firing&&index===2)fire();
      manager.aiming=active&&(punch>0||(index>0&&locks()));
      person.rig.streetGear=active&&index>0&&punch<=0;
      person.rig.streetPunch=punch>0?Math.sin(Math.PI*(1-punch/.38)):0;
      person.rig.streetSide=punchSide;
      gun.visible=active&&index>0&&punch<=0;
      if(gun.visible){
        person.rig.ragdollPoints(handPoints);
        gun.position.fromArray(handPoints,RAGDOLL_POINTS.WRIST_R*3);
        gun.rotation.set(0,person.heading,0);
        gun.rotateX(locks()?cameraSystem.walkPitch:0);
        gun.updateMatrixWorld();
      }
      for(let i=trails.length-1;i>=0;i--){
        const t=trails[i],p=t.p;
        if(clock>t.until||!p.placed||p.streetGeneration!==t.generation||!p.fall){trails.splice(i,1);continue;}
        const travel=Math.hypot(p.x-t.x,p.z-t.z);
        const low=p.ragdoll&&p.ragdoll.pelvisY-ground(p.x,p.z)<.66;
        if(travel>.22){if(low&&travel<4)effects.trail(t.x,t.z,p.x,p.z);t.x=p.x;t.z=p.z;}
      }
      if(dt>0){
        for(const [v,t] of tires){
          const x=v.position?.x??v.x,z=v.position?.z??v.z,yaw=v.heading??v.yaw;
          const dist=Math.hypot(x-t.x,z-t.z);
          if(clock>t.until||dist>10||t.left<=0||(!v.position&&!v.edge&&!v.streetHeld)){tires.delete(v);continue;}
          if(dist<.19)continue;
          const offset=(v.halfWidth||.92)*.78*t.side;
          const count=Math.min(16,Math.ceil(dist/.23));
          for(let i=1;i<=count;i++)effects.tire(t.x+(x-t.x)*i/count+Math.cos(yaw)*offset,
            t.z+(z-t.z)*i/count-Math.sin(yaw)*offset,yaw,Math.max(0,t.left/15));
          t.x=x;t.z=z;t.left-=dist;
        }
        effects.update(dt);
      }
      if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)message.hidden=true;}
      lastHitFlash=Math.max(0,lastHitFlash-dt);cross.classList.toggle('hit',lastHitFlash>0);
      if (+readout.dataset.attacks !== attacks) readout.dataset.attacks=String(attacks);
      if (+readout.dataset.hits !== hits) readout.dataset.hits=String(hits);
      if (+readout.dataset.cries !== screams) readout.dataset.cries=String(screams);
      refresh();
    }
  };
}
