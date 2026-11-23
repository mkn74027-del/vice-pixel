// Four corner crush values and two rocker-panel values in vehicle space.
const unit=n=>Math.min(1,Math.max(0,n));
export function vehicleOf(entity){
  const v=entity?.trafficCar||entity;
  return v&&(v.bodyType||v.type==='car')?v:null;
}
export function applyImpact(entity,x,z,speed,projectile=false){
  const v=vehicleOf(entity);
  if(!v||!Number.isFinite(x+z+speed)||speed<2.4)return false;
  const yaw=v.heading??(v.yaw+(v.yawOffset||0)),dx=x-(v.position?.x??v.x),dz=z-(v.position?.z??v.z);
  const lateral=(dx*Math.cos(yaw)-dz*Math.sin(yaw))/(v.halfWidth||.94);
  const along=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/(v.halfL||v.half||2.2);
  const d=v.crush||(v.crush=new Float32Array(6));
  const force=projectile?.065:Math.min(.79,((speed-2.4)/16)**1.28);
  const left=unit(.5+lateral*.72),end=unit((Math.abs(along)-.35)/.48);
  const nose=along>=0?0:2;
  function push(i,w){d[i]=unit(d[i]+force*w*(1-.65*d[i]));}
  push(nose,end*(.22+.78*left));push(nose+1,end*(1-.78*left));
  push(lateral>=0?4:5,(1-end)*.98+end*.11);
  return true;
}
export function vehicleRay(v,ray,limit){
  const px=v.position?.x??v.x,pz=v.position?.z??v.z,py=v.position?.y??v.streetY??0;
  const dx=ray.origin.x-px,dz=ray.origin.z-pz;
  if(Math.hypot(dx,dz)>limit+4)return limit;
  const yaw=v.heading??(v.yaw+(v.yawOffset||0)),sx=Math.sin(yaw),cx=Math.cos(yaw);
  const o=[dx*cx-dz*sx,ray.origin.y-py,dx*sx+dz*cx],d=[ray.direction.x*cx-ray.direction.z*sx,ray.direction.y,ray.direction.x*sx+ray.direction.z*cx];
  const w=v.halfWidth||.92,l=v.halfL||v.half||2.18;
  function box(lo,hi){
    let a=.02,b=limit;
    for(let k=0;k<3;k++){
      if(Math.abs(d[k])<1e-6){if(o[k]<lo[k]||o[k]>hi[k])return limit;continue;}
      const t1=(lo[k]-o[k])/d[k],t2=(hi[k]-o[k])/d[k];
      a=Math.max(a,Math.min(t1,t2));b=Math.min(b,Math.max(t1,t2));
      if(b<a)return limit;
    }
    return a;
  }
  const tall=['van','suv','minivan','pickup'].includes(v.bodyType);
  return Math.min(box([-w,.23,-l],[w,tall?1.04:.89,l]),box([-w*.81,.83,-l*.72],[w*.81,tall?1.77:1.42,l*.39]));
}
