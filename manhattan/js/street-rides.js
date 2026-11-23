import * as THREE from 'three/webgpu';

const names={taxi:'Taxi',sedan:'Limousine',suv:'SUV',pickup:'Pickup',minivan:'Minivan',van:'Lieferwagen'};
const yawOf=v=>v.yaw+(v.yawOffset||0);
function beside(v,outward,along=.32){
  const yaw=yawOf(v),c=Math.cos(yaw),s=Math.sin(yaw);
  return {x:v.x+c*outward+s*along,z:v.z-s*outward+c*along};
}
export function createStreetRides({manager,traffic,selectMode,camera,scene,audio}){
  const person=manager.entities.person, taxi=manager.entities.car;
  const bar=document.querySelector('#ride-context'), toast=document.querySelector('#ride-notice');
  const ghost=new THREE.Object3D(), pivot=new THREE.Object3D();
  ghost.add(pivot);
  const controllable={...taxi,mesh:ghost,chassisPivot:pivot,position:taxi.position.clone(),headLights:[],wheels:[],carState:null};
  const door=new THREE.Group(),hinge=new THREE.Group();
  const paint=new THREE.MeshStandardNodeMaterial({roughness:.35,metalness:.35});
  const lining=new THREE.MeshStandardNodeMaterial({color:0x252b31,roughness:.86});
  const glass=new THREE.MeshStandardNodeMaterial({color:0x536b79,roughness:.18,metalness:.5});
  function panel(parent,mat,x,y,z,w,h,l){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  door.add(hinge);
  panel(hinge,paint,0,.66,-.49,.075,.49,.98);
  panel(hinge,lining,-.043,.67,-.49,.018,.44,.92);
  panel(hinge,glass,-.025,1.07,-.49,.035,.34,.94);
  panel(hinge,lining,-.035,1.25,-.49,.044,.045,.97);
  panel(hinge,lining,0,1.07,-.95,.055,.39,.045);
  panel(hinge,lining,0,1.07,-.04,.055,.39,.045);
  panel(hinge,lining,.047,.84,-.77,.025,.05,.16);
  scene.add(door);door.visible=false;
  let pull=null,driven=null,noticeTime=0,sample=0,initialized=false;
  function notice(text){toast.textContent=text;toast.hidden=false;noticeTime=3;}
  function doorDistance(v){
    const yaw=yawOf(v),dx=person.position.x-v.x,dz=person.position.z-v.z;
    const side=dx*Math.cos(yaw)-dz*Math.sin(yaw),along=dx*Math.sin(yaw)+dz*Math.cos(yaw);
    return Math.hypot(Math.abs(side)-v.halfWidth,Math.max(0,Math.abs(along-.32)-.7));
  }
  function nearby(){
    let choice=null,score=3.1;
    for(const v of traffic.cars){
      if((!v.edge&&!v.streetHeld)||v.streetBusy||Math.abs(v.speed)>3.4)continue;
      if(Math.abs(person.position.y-(v.streetY||0))>2.1)continue;
      const d=doorDistance(v);
      if(d<score){choice=v;score=d;}
    }
    const ownDist=Math.hypot(taxi.position.x-person.position.x,taxi.position.z-person.position.z);
    return ownDist<4.2&&(!choice||ownDist-1.3<score)?taxi:choice;
  }
  function standAt(x,z,heading){
    person.position.set(x,manager.getGroundHeight(x,z,'person'),z);
    manager.resolveHorizontalCollision(person.position,.42,null,person);
    person.heading=heading;person.walkVX=person.walkVZ=person.speed=person.verticalVel=0;
    person.prevX=person.position.x;person.prevZ=person.position.z;
  }
  function board(v){
    if(v===taxi){manager.entities.car=taxi;}
    else {
      driven=v;v.streetController=controllable;v.streetBusy=false;v.streetEmpty=false;
      const c=controllable;
      c.trafficCar=v;c.label=v.isPolice?'Streifenwagen':names[v.bodyType]||'Wagen';
      c.position.set(v.x,manager.getGroundHeight(v.x,v.z,'car'),v.z);
      c.prevX=v.x;c.prevZ=v.z;c.heading=yawOf(v);
      c.speed=c.vx=c.vz=c.angularVel=c.pitchVel=c.rollVel=c.heaveY=c.heaveVel=c.steerAngle=0;
      c.chassisPivot.rotation.set(0,0,0);c.chassisPivot.position.y=0;c.lastCollisionSpark=null;
      manager.entities.car=c;
    }
    person.streetPull=false;selectMode('car');camera.resetForTeleport();manager.resetInput();
    bar.textContent='';bar.hidden=true;
  }
  function leaving(mode){
    if(pull&&mode!=='person')cancelPull();
    if(manager.activeMode!=='car'||mode==='car')return;
    const c=manager.entities.car,side=(driven?.halfWidth||.95)+1.45;
    if(mode==='person')standAt(c.position.x+Math.cos(c.heading)*side,c.position.z-Math.sin(c.heading)*side,c.heading);
    if(driven){
      Object.assign(driven,{x:c.position.x,z:c.position.z,yaw:c.heading,streetY:c.position.y,speed:0,streetEmpty:true,streetController:null,streetBusy:false});
      driven=null;manager.entities.car=taxi;
    }
    person.inVehicle=false;
  }
  function cancelPull(){
    if(!pull)return;
    const {v,p}=pull;
    if(p.phase==='pull'){p.placed=false;if(!traffic.returnStreetCar(v)){v.streetBusy=false;v.streetEmpty=true;}}
    else v.streetBusy=false;
    person.streetPull=false;person.rig.streetReach=0;door.visible=false;pull=null;
  }
  function interact(){
    if(pull||person.streetStun>0)return;
    if(manager.activeMode==='car'){
      if(Math.abs(manager.entities.car.speed)>3){notice('Zum Aussteigen abbremsen.');return;}
      selectMode('person');camera.resetForTeleport();return;
    }
    if(manager.activeMode!=='person')return;
    const v=nearby();
    if(!v){notice('Geh neben die Tür eines stehenden oder langsam rollenden Autos.');return;}
    if(v===taxi||(v.streetHeld&&v.streetEmpty)){board(v);return;}
    const seat=beside(v,v.halfWidth*.54),p=traffic.startDriver(v,seat.x,seat.z,yawOf(v));
    if(!p){notice('Hier ist gerade zu viel los.');return;}
    traffic.holdStreetCar(v);v.streetOwner=p;
    pull={p,v,time:0,startX:person.position.x,startZ:person.position.z};
    person.streetPull=true;manager.resetInput();
    paint.color.setRGB(...v.paint);door.visible=true;
    const a=beside(v,v.halfWidth,.83);
    door.position.set(a.x,manager.getGroundHeight(v.x,v.z,'car'),a.z);door.rotation.y=yawOf(v);
    bar.hidden=true;
  }
  function animatePull(dt){
    const t=pull.time+=dt,{p,v}=pull,side=v.halfWidth;
    const spot=beside(v,side+.6);
    const ease=Math.min(1,t/.32);
    person.position.x=pull.startX+(spot.x-pull.startX)*ease;
    person.position.z=pull.startZ+(spot.z-pull.startZ)*ease;
    person.heading=yawOf(v)-Math.PI/2;
    person.rig.streetReach=Math.sin(Math.PI*Math.min(1,t/1.15));
    hinge.rotation.y=-1.03*Math.min(1,t/.3,(1.48-t)/.36);
    door.updateMatrixWorld();
    if(p.phase==='pull'){
      const u=Math.max(0,Math.min(1,(t-.23)/.54)),q=beside(v,side*.54+(side*.46+1.15)*u,.32-.22*u);
      p.x=q.x;p.z=q.z;p.heading=yawOf(v)+1.8*u;p.seatOffset=-.44*(1-u);
      if(t>=.8){p.seatOffset=0;traffic.dropDriver(p,Math.cos(yawOf(v))*2.8,-Math.sin(yawOf(v))*2.8);}
    }
    if(t>=1.48){door.visible=false;pull=null;person.rig.streetReach=0;board(v);}
  }
  function ownerMoves(p,dt){
    if(!p.placed||p.phase==='pull')return;
    const v=p.car,c=manager.getActiveEntity(),distPlayer=Math.hypot(c.position.x-p.x,c.position.z-p.z);
    p.age+=dt;
    if(distPlayer>85 || (p.age>55&&distPlayer>22)){p.placed=false;return;}
    p.rig.streetPunch=0;
    if(p.fall||p.streetInjury)return;
    p.timer+=dt;p.hitDelay=Math.max(0,p.hitDelay-dt);
    const foot=manager.activeMode==='person', inOwnCar=driven===v;
    if(!v.streetHeld||v.streetOwner!==p)p.phase='flee';
    if(p.phase==='chase'&&(p.timer>23||Math.hypot(p.x-v.x,p.z-v.z)>32))p.phase='flee';
    const doorPos=beside(v,v.halfWidth+.57),doorGap=Math.hypot(doorPos.x-p.x,doorPos.z-p.z);
    const fighting=p.phase==='chase'&&foot&&distPlayer<2.7;
    const tx=fighting?person.position.x:doorPos.x,tz=fighting?person.position.z:doorPos.z;
    let dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);
    if(p.phase==='flee'){
      dx=p.x-c.position.x;dz=p.z-c.position.z;d=Math.hypot(dx,dz);
      if(d<.05){dx=1;dz=.3;d=1.04;}
    }
    if(d>.28){
      const speed=p.phase==='flee'?4.1:3.7, step=Math.min(d,speed*dt);
      const advance=!fighting||distPlayer>1.08;
      if(advance){
        const pos=new THREE.Vector3(p.x+dx/d*step,manager.getGroundHeight(p.x,p.z,'person'),p.z+dz/d*step);
        manager.resolveHorizontalCollision(pos,.35,null,p);p.x=pos.x;p.z=pos.z;
      }
      p.heading=Math.atan2(dx,dz);
    }
    if(fighting&&distPlayer<1.55){
      if(p.hitDelay===0){
        p.hitDelay=1.05;p.rig.streetSide=1-(p.rig.streetSide||0);
        person.streetStun=.28;
        const d=Math.max(.01,distPlayer);
        person.position.x+=(person.position.x-p.x)/d*.75;person.position.z+=(person.position.z-p.z)/d*.75;
        manager.resolveHorizontalCollision(person.position,.43,null,person);
        flash();notice('Der Fahrer schlägt zurück.');
      }
      p.rig.streetPunch=Math.max(0,Math.sin(Math.PI*Math.min(1,(1.05-p.hitDelay)/.32)));
    }
    if(p.phase!=='chase'||!v.streetHeld||doorGap>1.45||Math.abs(v.speed)>2.4){p.reach=0;return;}
    p.reach+=dt;p.rig.streetPunch=Math.max(p.rig.streetPunch,.55);
    if(inOwnCar&&p.reach>0&&p.reach<=dt)notice('Der Fahrer greift nach der Tür!');
    if(p.reach<(inOwnCar?1.45:.85))return;
    if(inOwnCar){selectMode('person');camera.resetForTeleport();person.streetStun=.65;flash();}
    if(traffic.returnStreetCar(v)){p.placed=false;v.streetOwner=null;notice('Der Fahrer hat seinen Wagen zurück.');}
    else {p.phase='flee';p.reach=0;}
  }
  function flash(){
    document.body.classList.remove('owner-hit');void document.body.offsetWidth;document.body.classList.add('owner-hit');
  }
  function initialize(){
    if(initialized||manager.activeMode!=='person')return;initialized=true;
    const v=traffic.placeWaitingCar(person.position.x,person.position.z);
    if(!v)return;
    const side=((person.position.x-v.x)*Math.cos(v.yaw)-(person.position.z-v.z)*Math.sin(v.yaw))<0?-1:1;
    const a=beside(v,side*(v.halfWidth+1.75),-.92);
    standAt(a.x,a.z,Math.atan2(v.x-a.x,v.z-a.z));camera.resetForTeleport();
  }
  return {interact,leaving,initialize,get busy(){return !!pull;},update(dt){
    if(!dt)return;
    if(pull)animatePull(dt);
    for(const p of traffic.drivers)ownerMoves(p,dt);
    if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)toast.hidden=true;}
    if((sample-=dt)>0)return;sample=.12;
    const v=(!pull&&manager.activeMode==='person')?nearby():null;
    const label=v?(v===taxi||(v.streetHeld&&v.streetEmpty)?'F · Einsteigen':'F · Fahrer herausziehen'):'';
    if(bar.textContent!==label)bar.textContent=label;bar.hidden=!label;
  }};
}
