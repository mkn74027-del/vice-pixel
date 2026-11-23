const limits=[14,40,76,122,182];
export function createDispatch({manager,traffic,release}){
  const hud=document.querySelector('#pursuit'), stars=hud.querySelector('b'),status=hud.querySelector('span');
  const cooldown=new Map();
  let heat=0,clock=0,last=0,search=0,hold=0,tick=0,level=0,custody=0;
  function report(event,points,interval=0){
    if(custody>0||clock<(cooldown.get(event)??-1))return;
    heat=Math.min(235,heat+points);last=clock;search=0;
    cooldown.set(event,clock+interval);
  }
  function draw(label){
    hud.hidden=!level&&!custody;
    hud.dataset.stars=String(level);
    const symbols='★'.repeat(level)+'☆'.repeat(5-level);
    if(stars.textContent!==symbols)stars.textContent=symbols;
    if(status.textContent!==label)status.textContent=label;
    hud.setAttribute('aria-label',level+' Fahndungssterne. '+label);
  }
  return {report,update(dt){
    if(!dt)return;clock+=dt;
    if(custody>0){custody=Math.max(0,custody-dt);if(!custody)draw('');return;}
    if((tick-=dt)>0)return;
    const span=.25-tick;tick=.25;
    const next=limits.filter(n=>heat>=n).length;
    if(!next&&!level)return;
    level=next;
    const e=manager.getActiveEntity(),p=e.position;
    traffic.updateDispatch(level,p.x,p.z);
    if(!level){hold=0;draw('');return;}
    let nearest=Infinity;
    if(p.y<10)for(const c of traffic.cars){
      if(!c.responding||c.streetHeld||!c.edge)continue;
      const d=Math.hypot(c.x-p.x,c.z-p.z);
      if(d>95||d>=nearest)continue;
      // Cars on the other side of a solid city block cannot keep visual contact.
      const colliders=manager.nearColliders((c.x+p.x)*.5,(c.z+p.z)*.5,d*.5+1);
      let clear=true;
      for(let i=3;i<d;i+=3.5){
        const x=c.x+(p.x-c.x)*i/d,z=c.z+(p.z-c.z)*i/d;
        if(colliders.some(b=>manager.sphereContact(b,x,1.42,z,.14,contact))){clear=false;break;}
      }
      if(clear)nearest=d;
    }
    search=nearest<84?0:search+span;
    hold=(nearest<7.6&&Math.abs(e.speed||0)<1.25&&clock-last>2)?hold+span:0;
    if(hold>=5){
      heat=level=hold=0;custody=3;traffic.updateDispatch(0,p.x,p.z);release();
      draw('Festgenommen');return;
    }
    if(search>5&&clock-last>8)heat=Math.max(0,heat-span*(3.1+search*.12));
    draw(hold>0?'Festnahme · '+Math.max(1,Math.ceil(5-hold))+' s':search>5?'Suche läuft':'Verfolgung');
  }};
}
const contact={};