/* A translucent link sphere: every node remains visible, and every label stays upright. */
window.createPlayScene = function(stage, {kind='network', items=[], onSelect=()=>{}, motion=true}={}) {
  const G=window.PortfolioOrbitGeometry,canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d'),layer=stage.querySelector('.orbit-items');
  const capability=kind==='capability', network=kind==='network'||capability, linked=network||kind==='platform';
  let w=0,h=0,rx=-.15,ry=.18,vx=0,vy=0,down=false,lastX=0,lastY=0,moved=0,raf=0,last=0,pointerTime=0;
  let auto=motion,alive=true,lastDrag=performance.now(),pressedNode=null,selected='',hovered='',inView=true,target=null;
  const sphere=G.sphere;
  const positions=items.map((_,i)=>sphere(i,items.length,network?1.24:1.32));
  const mesh=Array.from({length:capability?70:110},(_,i)=>sphere(i,capability?70:110));
  const edges=[];
  mesh.forEach((p,i)=>mesh.map((q,j)=>({j,d:p.reduce((n,v,k)=>n+(v-q[k])**2,0)})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d).slice(0,5).forEach(x=>{if(x.j>i)edges.push([i,x.j]);}));
  const nodes=items.map(item=>{
    const b=document.createElement('button');b.className=capability?'orbit-node capability-node':network?'orbit-node':'orbit-tool';b.type='button';b.innerHTML=item.html;
    b.setAttribute('aria-label',item.label+(item.groupLabel?' · '+item.groupLabel:''));b.setAttribute('aria-pressed','false');b.dataset.item=item.id;
    b.onclick=e=>{if(e.detail===0){reveal(item.id);onSelect(item);}};
    b.onpointerenter=()=>{hovered=item.id;};b.onpointerleave=()=>{hovered='';};
    b.onfocus=()=>{hovered=item.id;lastDrag=performance.now();};b.onblur=()=>{hovered='';};layer.append(b);return b;
  });
  const radius=()=>Math.min(w,h)*(capability?.32:network?.34:.29);
  const project=p=>G.project(G.rotate(p,rx,ry),radius(),w,h);
  function line(a,b,color,width=.7){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function graph(){
    const pts=mesh.map(project);
    for(const [i,j] of edges){const a=pts[i],b=pts[j],front=Math.max(0,Math.min(1,(1.2-(a.z+b.z)/2)/2.4));line(a,b,'rgba(167,157,239,'+(.035+front*.31)+')',.65);}
    for(const p of pts){const front=(1.2-p.z)/2.4;ctx.beginPath();ctx.arc(p.x,p.y,.7+front*1.15,0,Math.PI*2);ctx.fillStyle='rgba(236,219,255,'+(.15+front*.75)+')';ctx.fill();}
    const anchor=items.findIndex(x=>x.id===(hovered||selected));
    if(anchor>=0){const a=project(positions[anchor]);positions.forEach((p,i)=>{if(i===anchor)return;const b=project(p),depth=G.labelState(G.rotate(p,rx,ry)).depth;line(a,b,'rgba(201,185,142,'+(.05+depth*.18)+')',.65);ctx.beginPath();ctx.arc(b.x,b.y,1.8+depth,0,Math.PI*2);ctx.fillStyle='rgba(233,205,157,'+(.25+depth*.6)+')';ctx.fill();});}
  }
  function toolOrbits(){
    for(let i=0;i<3;i++){ctx.beginPath();for(let j=0;j<=90;j++){const a=j/90*Math.PI*2,p=project(i===0?[1.28*Math.cos(a),1.28*Math.sin(a),0]:i===1?[1.28*Math.cos(a),0,1.28*Math.sin(a)]:[0,1.28*Math.cos(a),1.28*Math.sin(a)]);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle='rgba(201,185,142,.15)';ctx.lineWidth=.8;ctx.stroke();}
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.min(w,h)*.5);
    glow.addColorStop(0,'rgba(122,99,223,.11)');glow.addColorStop(1,'rgba(122,99,223,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    linked?graph():toolOrbits();
    nodes.forEach((b,i)=>{
      const q=G.rotate(positions[i],rx,ry),state=G.labelState(q);
      b.style.transform=G.transform(positions[i],rx,ry,radius(),w,h);
      b.style.opacity=String(state.opacity);b.style.visibility='visible';b.style.pointerEvents='auto';b.style.zIndex=String(Math.round(100-q[2]*30));
      b.tabIndex=0;b.setAttribute('aria-hidden','false');b.dataset.hemisphere=q[2]<=0?'front':'rear';
    });
    stage.dataset.rotation=rx.toFixed(3)+','+ry.toFixed(3);
  }
  const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function reveal(id,instant=false){
    const i=items.findIndex(x=>x.id===id);if(i<0)return;const angles=G.frontAngles(positions[i]);vx=vy=0;lastDrag=performance.now();
    if(instant||!auto){rx=angles.rx;ry=angles.ry;target=null;draw();}else target={rx:rx+delta(angles.rx,rx),ry:ry+delta(angles.ry,ry)};
  }
  function loop(t){
    if(!alive)return;raf=requestAnimationFrame(loop);if(document.hidden||!inView){last=t;return;}const dt=Math.min(Math.max((t-last)/1000,.001),.04);last=t;
    if(!down){if(target){const ease=1-Math.exp(-8*dt);rx+=(target.rx-rx)*ease;ry+=(target.ry-ry)*ease;if(Math.abs(target.rx-rx)+Math.abs(target.ry-ry)<.001){rx=target.rx;ry=target.ry;target=null;}}else{if(auto&&!hovered&&t-lastDrag>4000)ry+=(network?.065:.09)*dt;rx+=vy*dt;ry+=vx*dt;const friction=Math.exp(-4.6*dt);vx*=friction;vy*=friction;if(Math.abs(vx)<.0005)vx=0;if(Math.abs(vy)<.0005)vy=0;}}draw();
  }
  function resize(){const r=stage.getBoundingClientRect();w=r.width;h=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  const ro=new ResizeObserver(resize);ro.observe(stage);
  const io=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;});io.observe(stage);
  function start(e){if(e.button!==0)return;e.preventDefault();pressedNode=e.target.closest('.orbit-node,.orbit-tool');down=true;target=null;moved=0;vx=vy=0;lastX=e.clientX;lastY=e.clientY;pointerTime=performance.now();stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');stage.dataset.dragging='true';lastDrag=pointerTime;}
  function move(e){if(!down)return;const dx=e.clientX-lastX,dy=e.clientY-lastY,now=performance.now(),dt=Math.max((now-pointerTime)/1000,.008);moved+=Math.abs(dx)+Math.abs(dy);ry+=dx*.0045;rx+=dy*.004;vx=Math.max(-2.8,Math.min(2.8,dx*.0045/dt));vy=Math.max(-2.8,Math.min(2.8,dy*.004/dt));pointerTime=now;lastX=e.clientX;lastY=e.clientY;draw();}
  function end(e){if(!down)return;down=false;stage.classList.remove('dragging');stage.dataset.dragging='false';lastDrag=performance.now();if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(!auto||lastDrag-pointerTime>100||e.type==='pointercancel')vx=vy=0;if(e.type==='pointerup'&&moved<6&&pressedNode){const item=items.find(x=>x.id===pressedNode.dataset.item);if(item){reveal(item.id);onSelect(item);}}pressedNode=null;}
  function keys(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();lastDrag=performance.now();vx=vy=0;target=null;if(e.key==='Home'){reveal(selected||items[0]?.id,true);return;}if(e.key==='ArrowLeft')ry-=.15;if(e.key==='ArrowRight')ry+=.15;if(e.key==='ArrowUp')rx-=.15;if(e.key==='ArrowDown')rx+=.15;draw();}
  stage.addEventListener('pointerdown',start);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('keydown',keys);resize();raf=requestAnimationFrame(loop);
  return {dispose(){alive=false;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();stage.removeEventListener('pointerdown',start);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',end);stage.removeEventListener('pointercancel',end);stage.removeEventListener('keydown',keys);},reset(){reveal(selected||items[0]?.id,true);},reveal,motion(value){auto=value;if(!auto){vx=vy=0;if(target){rx=target.rx;ry=target.ry;target=null;draw();}}},select(id){selected=id;nodes.forEach(b=>{b.classList.toggle('picked',b.dataset.item===id);b.setAttribute('aria-pressed',b.dataset.item===id);});draw();}};
};
