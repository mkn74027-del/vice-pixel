import * as THREE from 'three/webgpu';
import { TELEPORT_LOCATIONS, isTypingInField } from './city-config.js';

const jobs=[
  {id:'midtown',name:'Midtown Express',text:'Vier Lieferungen durch Midtown. An jedem gelben Ziel kurz anhalten.',mode:'car',reward:650,seconds:600,stops:[['bryant','Bryant Park'],['timessq','Times Square'],['grandcentral','Grand Central'],['empire','Empire State']]},
  {id:'downtown',name:'Von Uptown nach Downtown',text:'Fahre vom Central Park über Flatiron bis zum One World Trade Center.',mode:'car',reward:1400,seconds:1050,stops:[['centralpark','Central Park South'],['flatiron','Flatiron'],['owtc','One World Trade Center']]},
  {id:'skyline',name:'Skyline-Pilot',text:'Fliege mit dem Heli über vier Wahrzeichen. Halte 60–240 m Höhe und reduziere am Ziel das Tempo.',mode:'helicopter',reward:950,seconds:600,stops:[['empire','Empire State'],['chrysler','Chrysler Building'],['timessq','Times Square'],['centralpark','Central Park']]}
];
const dollars=n=>'$'+Math.floor(n).toLocaleString('de-DE');
const clock=s=>Math.floor(Math.max(0,s)/60)+':'+String(Math.floor(Math.max(0,s)%60)).padStart(2,'0');
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}

export function createCityContracts({scene,controllerManager:manager,mapSystem,cameraSystem,selectMode}){
  let balance=0,completed=0,active=null,lastJob=jobs[0],toastTime=0,uiClock=0,spawnProtection=0;
  let previous=null,lastMode=manager.activeMode;
  const best=new Map();
  const root=element('aside','vice-missions');root.id='vice-missions';root.setAttribute('aria-label','Stadtaufträge');
  const bar=element('div','vice-bar');
  const toggle=element('button','vice-toggle','Aufträge [J]');toggle.type='button';toggle.setAttribute('aria-expanded','false');
  const account=element('span','vice-account',dollars(0));bar.append(toggle,account);
  const status=element('div','vice-objective','Freie Fahrt · F ein-/aussteigen · Maus ziehen: Kamera');
  const progress=element('div','vice-progress');const fill=element('span');progress.append(fill);
  const context=element('div','vice-context','M Karte · V Kamera · 1 Fuß · 2 Taxi · 3 Rad · 4 Heli');
  const cancel=element('button','vice-small','Auftrag abbrechen');cancel.type='button';cancel.hidden=true;
  const panel=element('div','vice-job-list');panel.hidden=true;
  const intro=element('p','','MANHATTAN / CITY CONTRACTS');panel.append(intro);
  for(const job of jobs){
    const card=element('div','vice-job');
    const title=element('strong','',job.name);
    const copy=element('p','',job.text);
    const info=element('span','vice-job-meta',dollars(job.reward)+' · '+clock(job.seconds)+' · '+(job.mode==='car'?'Taxi':'Helikopter'));
    const start=element('button','', 'Starten: '+job.name);start.type='button';
    start.addEventListener('click',()=>startJob(job));
    card.append(title,copy,info,start);panel.append(card);
  }
  const retry=element('button','vice-small','Letzten Auftrag neu starten');retry.type='button';retry.addEventListener('click',()=>startJob(lastJob));panel.append(retry);
  const storageNote=element('p','vice-note','Fortschritt bleibt nur in dieser Sitzung. Keine Installation und kein automatischer Spielstand.');
  panel.append(storageNote);
  const toast=element('div','vice-toast');toast.setAttribute('role','status');toast.hidden=true;
  root.append(bar,status,progress,context,cancel,panel,toast);document.body.append(root);

  const marker=new THREE.Group();marker.visible=false;scene.add(marker);
  const mat=new THREE.MeshBasicNodeMaterial({color:0xffce32,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(7,8.4,48),mat);ring.rotation.x=-Math.PI/2;marker.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,30,8,1,true),mat);beam.position.y=15;marker.add(beam);
  const flightRing=new THREE.Mesh(new THREE.TorusGeometry(18,.55,6,48),mat);marker.add(flightRing);

  function tell(message){toast.textContent=message;toast.hidden=false;toastTime=6;}
  function setPanel(open){panel.hidden=!open;root.classList.toggle('jobs-open',open);if(open && document.pointerLockElement)document.exitPointerLock();toggle.setAttribute('aria-expanded',String(open));manager.resetInput();}
  toggle.addEventListener('click',()=>setPanel(panel.hidden));
  cancel.addEventListener('click',()=>stopJob('Auftrag abgebrochen. Freie Fahrt.'));
  function stopJob(message){active=null;marker.visible=false;cancel.hidden=true;fill.style.width='0%';tell(message);}
  function target(){if(!active)return null;const [key,name]=active.job.stops[active.stage];return {...TELEPORT_LOCATIONS[key],name};}
  function setTarget(){
    const p=target();if(!p)return;
    mapSystem.waypoint={x:p.x,z:p.z,name:p.name};
    const air=active.job.mode==='helicopter';
    marker.position.set(p.x,air?105:manager.getGroundHeight(p.x,p.z,'car')+.18,p.z);
    marker.visible=true;marker.updateMatrixWorld(true);ring.visible=beam.visible=!air;flightRing.visible=air;mapSystem.miniDrawn=null;
  }
  function startJob(job){
    lastJob=job;active={job,stage:0,left:job.seconds,held:0,elapsed:0};
    previous=null;spawnProtection=1;cancel.hidden=false;setPanel(false);setTarget();
    tell(job.name+' gestartet. '+(job.mode==='car'?'Taxi wählen [2]. Am Ziel anhalten.':'Heli wählen [4]. Mit Leertaste steigen.'));
  }
  function enterExit(){
    const mode=manager.activeMode;
    if(mode==='car'){
      const car=manager.entities.car;
      if(Math.abs(car.speed)>2.5){tell('Zum Aussteigen zuerst anhalten.');return;}
      car.speed=car.vx=car.vz=car.angularVel=0;
      selectMode('person');
      manager.teleportActiveTo(car.position.x+Math.cos(car.heading)*3.8,car.position.z-Math.sin(car.heading)*3.8,car.heading);
      cameraSystem.resetForTeleport();previous=null;spawnProtection=1;tell('Ausgestiegen. Mit F steigst du wieder ins Taxi.');
    }else if(mode==='person'){
      const car=manager.entities.car,p=manager.entities.person;
      if(Math.hypot(car.position.x-p.position.x,car.position.z-p.position.z)>9){tell('Gehe näher an dein gelbes Taxi.');return;}
      selectMode('car');p.mesh.visible=false;p._charHidden=true;cameraSystem.resetForTeleport();previous=null;spawnProtection=1;tell('Eingestiegen. W Gas · S bremsen/rückwärts · A/D lenken.');
    }else tell('F gilt für dein Taxi. Zum Gehen Taste 1 verwenden.');
    manager.resetInput();
  }
  window.addEventListener('keydown',e=>{
    if(manager.inputBlocked||document.getElementById('street-menu')?.open||isTypingInField(e)||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='KeyJ'){e.preventDefault();setPanel(panel.hidden);}
    if(e.code==='KeyF'&&!mapSystem.isFullMapOpen){e.preventDefault();enterExit();}
  });
  document.querySelectorAll('[data-teleport]').forEach(b=>b.addEventListener('click',()=>{
    previous=null;spawnProtection=1;
    if(active)stopJob('Schnellreise beendet den laufenden Auftrag. Du kannst ihn neu starten.');
  }));

  return {update(dt,elapsed){
    uiClock+=dt;spawnProtection=Math.max(0,spawnProtection-dt);
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)toast.hidden=true;}
    const entity=manager.getActiveEntity(),mode=manager.activeMode,p=entity.position;
    root.dataset.mode=mode;root.dataset.x=p.x.toFixed(2);root.dataset.y=p.y.toFixed(2);root.dataset.z=p.z.toFixed(2);
    root.dataset.balance=String(balance);root.dataset.completed=String(completed);root.dataset.stage=active?String(active.stage):'none';
    if(mode!==lastMode){previous=null;spawnProtection=1;lastMode=mode;}
    if(active){
      if(previous&&spawnProtection<=0&&Math.hypot(p.x-previous.x,p.z-previous.z)>Math.max(85,dt*180)){
        stopJob('Ortswechsel erkannt. Starte den Auftrag für einen fairen Versuch neu.');
      }else{
        active.elapsed+=dt;active.left-=dt;
        if(active.left<=0){stopJob('Zeit abgelaufen. Versuche den Auftrag erneut.');}
        else{
          const t=target(),d=Math.hypot(p.x-t.x,p.z-t.z),air=active.job.mode==='helicopter';
          // The GPS waypoint belongs to the contract while it is running.
          if(!mapSystem.waypoint||mapSystem.waypoint.name!==t.name)setTarget();
          const ready=mode===active.job.mode&&d<(air?55:18)&&Math.abs(entity.speed)<(air?18:2.8)&&(!air||(p.y>=60&&p.y<=240));
          active.held=ready?active.held+dt:0;
          fill.style.width=Math.min(100,active.held/1.2*100)+'%';
          marker.rotation.y=air?Math.atan2(p.x-t.x,p.z-t.z):0;
          ring.scale.setScalar(1+Math.sin(elapsed*3)*.035);
          if(active.held>=1.2){
            active.stage++;active.held=0;
            if(active.stage>=active.job.stops.length){
              const time=active.elapsed,job=active.job;
              const bonus=Math.floor(Math.max(0,active.left)*.4);
              balance+=job.reward+bonus;completed++;
              const record=best.get(job.id);best.set(job.id,Math.min(record??Infinity,time));
              account.textContent=dollars(balance);
              stopJob('Auftrag geschafft! '+dollars(job.reward+bonus)+' · '+clock(time)+(record===undefined||time<record?' · Neue Bestzeit!':''));
            }else{setTarget();tell('Lieferung bestätigt. Weiter zum nächsten Ziel!');}
          }
          if(active&&uiClock>.15){
            const km=d>=1000?(d/1000).toFixed(1)+' km':Math.ceil(d)+' m';
            status.textContent=active.job.name+' · '+(active.stage+1)+'/'+active.job.stops.length+' · '+t.name+' · '+km+' · '+clock(active.left);
            context.textContent=mode!==active.job.mode?'Fahrzeug wählen: '+(air?'4 Helikopter':'2 Taxi'):ready?'Position halten …':air?'60–240 m Höhe · Am Ziel unter 65 km/h':'Am gelben Ziel bis unter 10 km/h abbremsen';
          }
        }
      }
    }else if(uiClock>.15){
      status.textContent='Freie Fahrt · '+completed+' Aufträge erledigt';
      context.textContent='WASD bewegen · M Karte · Tab Spielmenü';
    }
    previous={x:p.x,z:p.z};
    if(uiClock>.15)uiClock=0;
  }};
}
