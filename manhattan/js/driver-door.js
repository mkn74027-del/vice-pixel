// Partition the original triangle surface at the driver-door seam. Both sides use
// the same interpolated seam vertices when the hinge is shut.
import * as THREE from 'three/webgpu';

export function splitDriverDoor(geometry,spec){
  const attrs=geometry.attributes;
  const names=Object.keys(attrs);
  const widths=names.map(k=>attrs[k].itemSize);
  const starts=[];let stride=0;
  for(const w of widths){starts.push(stride);stride+=w;}
  const pi=starts[names.indexOf('position')],ni=starts[names.indexOf('normal')],mi=starts[names.indexOf('partId')];
  const arrays=names.map(k=>Array.from(attrs[k].array)),flags=Array(attrs.position.count).fill(0),indices=[];
  const vertices=new Array(flags.length),doorIds=new Map();
  const original=geometry.index?.array;
  const front=spec.doors[0],rear=spec.doors[1],belt=spec.edge.reduce((best,v)=>Math.abs(v[0])<Math.abs(best[0])?v:best)[1];
  const top=spec.cabin.roofY[0][1]-.055,sill=spec.sill[1][1]+.066;
  const slope=(front-spec.cabin.roofFront)/Math.max(.2,top-belt);
  const planes=[v=>v[pi]-.54,v=>v[pi+2]-rear-.012,v=>front-v[pi+2]-.008,v=>v[pi+1]-sill,v=>top-v[pi+1],
    v=>front-v[pi+2]-slope*(v[pi+1]-belt)];
  function read(id){
    if(vertices[id])return vertices[id];
    const v=[];
    names.forEach((k,j)=>{for(let d=0;d<widths[j];d++)v.push(attrs[k].array[id*widths[j]+d]);});
    v.id=id;return vertices[id]=v;
  }
  function append(v,tag){
    if(v.id!==undefined&&tag===0)return v.id;
    if(v.id!==undefined&&doorIds.has(v.id))return doorIds.get(v.id);
    const id=flags.length;
    names.forEach((_,j)=>{for(let d=0;d<widths[j];d++)arrays[j].push(v[starts[j]+d]);});
    flags.push(tag);
    if(v.id!==undefined&&tag===1)doorIds.set(v.id,id);
    return id;
  }
  function face(poly,tag){
    if(poly.length<3)return;
    const a=append(poly[0],tag);
    for(let i=1;i<poly.length-1;i++)indices.push(a,append(poly[i],tag),append(poly[i+1],tag));
  }
  function partition(poly,plane){
    const inside=[],outside=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=plane(a),db=plane(b);
      (da>=0?inside:outside).push(a);
      if((da<0)===(db<0))continue;
      const t=da/(da-db),cut=a.map((v,k)=>v+(b[k]-v)*t);
      inside.push(cut);outside.push(cut);
    }
    return [inside,outside];
  }
  const count=original?.length??attrs.position.count;
  for(let i=0;i<count;i+=3){
    const ids=original?[original[i],original[i+1],original[i+2]]:[i,i+1,i+2];
    const type=attrs.partId.getX(ids[0]);
    if(type!==0&&type!==1&&type!==5){indices.push(...ids);continue;}
    let poly=ids.map(read);
    // Leave the hood, roof and cabin floor with the body. The mirror is on the door.
    if(type===5){face(poly,poly[0][pi]>0?1:0);continue;}
    if(poly.every(v=>v[ni]<.15)||planes.some(plane=>poly.every(v=>plane(v)<0))){indices.push(...ids);continue;}
    for(const plane of planes){
      if(poly.every(v=>plane(v)>=0))continue;
      const [inside,outside]=partition(poly,plane);face(outside,0);poly=inside;
      if(!poly.length)break;
    }
    if(!poly.length)continue;
    face(poly,1);
    // An inner door card travels with the actual panel. A recessed dark cabin
    // wall, sill and seat stay behind the opening.
    const card=poly.map(v=>{const a=v.slice();a[pi]-=.041;a[mi]=9;a[ni]*=-1;a[ni+1]*=-1;a[ni+2]*=-1;return a;}).reverse();
    face(card,1);
  }
  function panel(a,b,c,d){
    const verts=[a,b,c,d].map(p=>{const v=new Array(stride).fill(0);v[pi]=p[0];v[pi+1]=p[1];v[pi+2]=p[2];v[ni]=1;v[mi]=9;return v;});
    face(verts,0);face(verts.slice().reverse(),0);
  }
  const w=spec.wheelX,depth=.43;
  panel([depth,sill,rear],[depth,top,rear],[depth,top,front],[depth,sill,front]);
  panel([w,sill,rear],[depth,sill,rear],[depth,sill,front],[w,sill,front]);
  panel([w,sill,rear],[w,top,rear],[depth,top,rear],[depth,sill,rear]);
  panel([w,sill,front],[depth,sill,front],[depth,top,front],[w,top,front]);
  for(let i=0;i<names.length;i++)geometry.setAttribute(names[i],new THREE.Float32BufferAttribute(arrays[i],widths[i]));
  geometry.setAttribute('doorVertex',new THREE.Float32BufferAttribute(flags,1));
  geometry.setIndex(indices);
  return geometry;
}

export function noMovingDoor(geometry){
  geometry.setAttribute('doorVertex',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count),1));
  return geometry;
}