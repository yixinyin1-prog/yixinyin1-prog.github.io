/* A rotatable content graph and tool atlas. Nodes are real, keyboard-accessible controls. */
window.createPlayScene = function(stage, {kind='network', items=[], onSelect=()=>{}, motion=true}={}) {
  const canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d'),layer=stage.querySelector('.orbit-items');
  const capability=kind==='capability', network=kind==='network'||capability, linked=network||kind==='platform';
  let w=0,h=0,rx=-.15,ry=.18,vx=0,vy=0,down=false,lastX=0,lastY=0,moved=0,raf=0,last=0;
  let auto=motion,alive=true,lastDrag=performance.now(),pressedNode=null,selected='',hovered='',inView=true;
  const sphere=(i,n,r=1.2)=>{const y=1-2*(i+.5)/n,a=Math.PI*(3-Math.sqrt(5))*i,s=Math.sqrt(1-y*y);return[r*s*Math.cos(a),r*y,r*s*Math.sin(a)];};
  const positions=items.map((_,i)=>sphere(i,items.length,network?1.24:1.32));
  const mesh=Array.from({length:capability?70:110},(_,i)=>sphere(i,capability?70:110));
  const edges=[];
  mesh.forEach((p,i)=>mesh.map((q,j)=>({j,d:p.reduce((n,v,k)=>n+(v-q[k])**2,0)})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d).slice(0,5).forEach(x=>{if(x.j>i)edges.push([i,x.j]);}));
  const nodes=items.map(item=>{
    const b=document.createElement('button');b.className=capability?'orbit-node capability-node':network?'orbit-node':'orbit-tool';b.type='button';b.innerHTML=item.html;
    b.setAttribute('aria-label',item.label+(item.groupLabel?' · '+item.groupLabel:''));b.setAttribute('aria-pressed','false');b.dataset.item=item.id;
    b.onclick=e=>{if(e.detail===0)onSelect(item);};
    b.onpointerenter=()=>{hovered=item.id;};b.onpointerleave=()=>{hovered='';};
    b.onfocus=()=>{hovered=item.id;lastDrag=performance.now();};b.onblur=()=>{hovered='';};layer.append(b);return b;
  });
  const rotate=(x,y,z)=>{const a=y*Math.cos(rx)-z*Math.sin(rx),b=y*Math.sin(rx)+z*Math.cos(rx);return[x*Math.cos(ry)+b*Math.sin(ry),a,-x*Math.sin(ry)+b*Math.cos(ry)];};
  const project=p=>{let q=rotate(...p),k=4.8/(4.8+q[2]),r=Math.min(w,h)*(network?.34:.29);return{x:w/2+q[0]*r*k,y:h/2+q[1]*r*k,z:q[2],k};};
  function line(a,b,color,width=.7){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function graph(){
    const pts=mesh.map(project);
    for(const [i,j] of edges){const a=pts[i],b=pts[j],front=Math.max(0,Math.min(1,(1.2-(a.z+b.z)/2)/2.4));line(a,b,'rgba(113,226,169,'+(.07+front*.32)+')',.65);}
    for(const p of pts){const front=(1.2-p.z)/2.4;ctx.beginPath();ctx.arc(p.x,p.y,.7+front*1.15,0,Math.PI*2);ctx.fillStyle='rgba(210,255,217,'+(.25+front*.7)+')';ctx.fill();}
    const anchor=items.findIndex(x=>x.id===(hovered||selected));
    if(anchor>=0){const a=project(positions[anchor]);positions.forEach((p,i)=>{if(i===anchor)return;const b=project(p);line(a,b,'rgba(201,185,142,.26)',.8);ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fillStyle='#c9b98e';ctx.fill();});}
  }
  function toolOrbits(){
    for(let i=0;i<3;i++){ctx.beginPath();for(let j=0;j<=90;j++){const a=j/90*Math.PI*2,p=project(i===0?[1.28*Math.cos(a),1.28*Math.sin(a),0]:i===1?[1.28*Math.cos(a),0,1.28*Math.sin(a)]:[0,1.28*Math.cos(a),1.28*Math.sin(a)]);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle='rgba(201,185,142,.15)';ctx.lineWidth=.8;ctx.stroke();}
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.min(w,h)*.5);
    glow.addColorStop(0,'rgba(57,212,132,.11)');glow.addColorStop(1,'rgba(57,212,132,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    linked?graph():toolOrbits();
    const layout=nodes.map((b,i)=>{const p=project(positions[i]),front=(1.4-p.z)/2.8,scale=capability?1:network?.95+front*.07:.82+front*.22;return{b,p,front,scale,x:p.x,y:p.y,hw:b.offsetWidth*scale/2,hh:b.offsetHeight*scale/2};});
    if(network){
      for(const a of layout)a.x=Math.max(a.hw+5,Math.min(w-a.hw-5,a.x));
      // Seven content labels remain readable even when front and rear nodes align.
      for(let pass=0;pass<12;pass++)for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){
        const a=layout[i],b=layout[j],dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y),required=a.hh+b.hh+7;
        if(dx<a.hw+b.hw+7&&dy<required){if(capability&&a.hw+b.hw+7-dx<required-dy){const shift=(a.hw+b.hw+7-dx)/2+.3,direction=a.x<=b.x?-1:1;a.x=Math.max(a.hw+5,Math.min(w-a.hw-5,a.x+direction*shift));b.x=Math.max(b.hw+5,Math.min(w-b.hw-5,b.x-direction*shift));}else{const shift=(required-dy)/2+.3,direction=a.y<=b.y?-1:1;a.y=Math.max(a.hh+6,Math.min(h-a.hh-14,a.y+direction*shift));b.y=Math.max(b.hh+6,Math.min(h-b.hh-14,b.y-direction*shift));}}
      }
      for(const a of layout){a.y=Math.max(a.hh+6,Math.min(h-a.hh-14,a.y));if(Math.abs(a.x-a.p.x)+Math.abs(a.y-a.p.y)>4)line(a.p,a,'rgba(202,230,172,.35)',.65);}
    }
    layout.forEach(({b,p,front,scale,x,y})=>{
      b.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%) scale('+scale+')';b.style.opacity=String(capability?1:network?.9+front*.1:.72+front*.28);b.style.zIndex=String(Math.round(100-p.z*30));
    });
    stage.dataset.rotation=rx.toFixed(3)+','+ry.toFixed(3);
  }
  function loop(t){if(!alive)return;raf=requestAnimationFrame(loop);if(t-last<29||document.hidden||!inView)return;last=t;if(!down){if(auto&&!hovered&&t-lastDrag>5500)ry+=network?.0016:.0025;rx+=vy;ry+=vx;vx*=.93;vy*=.93;if(Math.abs(vx)<.00005)vx=0;if(Math.abs(vy)<.00005)vy=0;}draw();}
  function resize(){const r=stage.getBoundingClientRect();w=r.width;h=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  const ro=new ResizeObserver(resize);ro.observe(stage);
  const io=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;});io.observe(stage);
  function start(e){if(e.button!==0)return;pressedNode=e.target.closest('.orbit-node,.orbit-tool');down=true;moved=0;vx=vy=0;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');stage.dataset.dragging='true';lastDrag=performance.now();}
  function move(e){if(!down)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);vx=dx*.005;vy=dy*.005;ry+=vx;rx+=vy;lastX=e.clientX;lastY=e.clientY;draw();}
  function end(e){if(!down)return;down=false;stage.classList.remove('dragging');stage.dataset.dragging='false';lastDrag=performance.now();if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(!auto)vx=vy=0;if(e.type==='pointerup'&&moved<6&&pressedNode){const item=items.find(x=>x.id===pressedNode.dataset.item);if(item)onSelect(item);}pressedNode=null;}
  function keys(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();lastDrag=performance.now();vx=vy=0;if(e.key==='Home'){rx=-.15;ry=.18;}if(e.key==='ArrowLeft')ry-=.15;if(e.key==='ArrowRight')ry+=.15;if(e.key==='ArrowUp')rx-=.15;if(e.key==='ArrowDown')rx+=.15;draw();}
  stage.addEventListener('pointerdown',start);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('keydown',keys);resize();raf=requestAnimationFrame(loop);
  return {dispose(){alive=false;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();stage.removeEventListener('pointerdown',start);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',end);stage.removeEventListener('pointercancel',end);stage.removeEventListener('keydown',keys);},reset(){rx=-.15;ry=.18;vx=vy=0;lastDrag=performance.now();draw();},motion(value){auto=value;if(!auto)vx=vy=0;},select(id){selected=id;nodes.forEach(b=>{b.classList.toggle('picked',b.dataset.item===id);b.setAttribute('aria-pressed',b.dataset.item===id);});draw();}};
};
