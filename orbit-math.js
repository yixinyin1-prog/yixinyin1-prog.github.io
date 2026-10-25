/* An open spatial network. Labels retain a readable up direction at every rotation. */
window.PortfolioOrbitGeometry = (() => {
  const camera=4.8;
  const norm=p=>{const l=Math.hypot(...p);return p.map(v=>v/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function sphere(i,count,radius=1.2){const y=1-2*(i+.5)/count,a=Math.PI*(3-Math.sqrt(5))*i,s=Math.sqrt(1-y*y);return[radius*s*Math.cos(a),radius*y,radius*s*Math.sin(a)];}
  function rotate(p,rx,ry){const[x,y,z]=p,a=x*Math.cos(ry)+z*Math.sin(ry),b=-x*Math.sin(ry)+z*Math.cos(ry);return[a,y*Math.cos(rx)-b*Math.sin(rx),y*Math.sin(rx)+b*Math.cos(rx)];}
  function frame(p,rx,ry){const n=norm(p),u=Math.hypot(n[0],n[2])<1e-8?[1,0,0]:norm([-n[2],0,n[0]]),v=cross(u,n);return{q:rotate(p,rx,ry),u:rotate(u,rx,ry),v:rotate(v,rx,ry),n:rotate(n,rx,ry)};}
  function facing(q){const radius=Math.hypot(...q),distance=Math.hypot(q[0],q[1],q[2]+camera);return(-camera*q[2]-radius*radius)/(radius*distance);}
  function project(q,r,w,h){const k=camera/(camera+q[2]);return{x:w/2+q[0]*r*k,y:h/2+q[1]*r*k,z:q[2],k};}
  function labelState(q){
    const radius=Math.hypot(...q),depth=(1-q[2]/radius)/2;
    // Mild spatial tilt, never a rotated baseline, flipped glyph, or disappearing rear face.
    const yaw=q[0]/radius*.34,pitch=-q[1]/radius*.20,scale=.90+.10*depth;
    return{depth,yaw,pitch,scale,opacity:.40+.60*depth*depth*(3-2*depth)};
  }
  function labelMatrix(q,r){
    const{yaw,pitch,scale:s}=labelState(q),cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
    // CSS Ry * Rx: the screen-up and screen-right components always stay positive.
    return[cy*s,0,-sy*s,0,sy*sx*s,cx*s,cy*sx*s,0,sy*cx,-sx,cx*cy,0,q[0]*r,q[1]*r,-q[2]*r,1];
  }
  function transform(p,rx,ry,r,w,h){const q=rotate(p,rx,ry),matrix=labelMatrix(q,r);return`translate3d(${w/2}px,${h/2}px,0) perspective(${camera*r}px) matrix3d(${matrix.map(v=>v.toFixed(6)).join(',')}) translate(-50%,-50%)`;}
  function frontAngles(p){return{rx:Math.atan2(-p[1],Math.hypot(p[0],p[2])),ry:Math.atan2(p[0],-p[2])};}
  return{camera,sphere,rotate,frame,facing,project,transform,frontAngles,labelState,labelMatrix};
})();
