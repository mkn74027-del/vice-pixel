// VICE PIXEL: directed A* navigation on the same lane graph used by traffic.
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function findRoadRoute(network, start, goal) {
  const edges = network?.edges || [];
  if (!edges.length) return null;
  function nearest(p) {
    let best = null, score = Infinity;
    for (const e of edges) {
      const a = e.from, b = e.to;
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      const q = { x: a.x+dx*t, z: a.z+dz*t };
      const d = distance(p,q);
      if (d < score) { score=d; best={edge:e,point:q,t}; }
    }
    return score <= 160 ? best : null;
  }
  const s=nearest(start), g=nearest(goal);
  if (!s || !g) return null;
  const cost=e=>distance(e.from,e.to);
  if (s.edge===g.edge && g.t>=s.t) return [start,s.point,g.point,goal];
  const heap=[];
  function push(item) {
    heap.push(item); let i=heap.length-1;
    while (i>0) { const p=(i-1)>>1; if(heap[p].f<=item.f) break;heap[i]=heap[p];i=p; }
    heap[i]=item;
  }
  function pop() {
    const top=heap[0],last=heap.pop();
    if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}
    return top;
  }
  const root={...s.edge};
  const scores=new Map([[root,cost(s.edge)*(1-s.t)]]), parents=new Map();
  push({edge:root,g:scores.get(root),f:scores.get(root)+distance(s.edge.to,g.point)});
  let found=false;
  while(heap.length) {
    const current=pop(),e=current.edge;
    if(current.g!==scores.get(e)) continue;
    if(e===g.edge){found=true;break;}
    for(const move of e.moves||[]) {
      const next=move.to;
      const newG=current.g+cost(next)*(next===g.edge?g.t:1);
      if(newG>=(scores.get(next)??Infinity))continue;
      scores.set(next,newG);parents.set(next,e);
      push({edge:next,g:newG,f:newG+(next===g.edge?0:distance(next.to,g.point))});
    }
  }
  if(!found)return null;
  const path=[g.edge];
  while(path[path.length-1]!==root){const p=parents.get(path[path.length-1]);if(!p)return null;path.push(p);}
  path.reverse();
  return [start,s.point,...path.slice(0,-1).map(e=>({x:e.to.x,z:e.to.z})),g.point,goal];
}
export function createNavigator(network, manager) {
  let origin=null,target=null,cached=null,air=false;
  return (position,waypoint)=>{
    if(!waypoint)return null;
    const flying=manager.activeMode==='helicopter';
    if(!origin||!target||distance(origin,position)>20||distance(target,waypoint)>0.1||air!==flying){
      origin={x:position.x,z:position.z};target={x:waypoint.x,z:waypoint.z};air=flying;
      cached=flying?[origin,target]:findRoadRoute(network,origin,target);
    }
    return cached ? [{x:position.x,z:position.z},...cached.slice(1)] : null;
  };
}
