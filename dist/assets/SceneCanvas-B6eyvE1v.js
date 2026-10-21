var me=Object.defineProperty;var de=(t,e,o)=>e in t?me(t,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):t[e]=o;var V=(t,e,o)=>de(t,typeof e!="symbol"?e+"":e,o);import{j as i,g as xe}from"./motion-BSOt5rCy.js";import{r as n}from"./react-CAz9_-H3.js";import{u as N,V as he,S as ie,b as Z,C as U,R as ve,P as pe,d as R,e as F,E as ge,L as ee,f as ce,g as ue,h as ye,i as Me,j as le,k as we,M as Se,O as be,l as te,m as je,D as Ce,n as Pe,o as Ee}from"./three-O3hTsdP7.js";import{u as w,f as $,s as z,p as j,a as H,d as A,b as L,T as oe,C as O,c as W,e as Re}from"./SceneLayer-DiDj-fVk.js";import"./index-9Qt9HLi2.js";const Te=`
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,ke=`
  uniform vec3 uBase;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform vec2 uCursor;
  uniform float uTime;
  uniform vec4 uR[4];
  varying vec3 vWorld;

  void main() {
    vec2 p = vWorld.xy;
    float near = smoothstep(3.2, 0.0, distance(p, uCursor));

    vec2 samplePos = p;
    float ring = 0.0;
    float tint = 0.0;

    for (int i = 0; i < 4; i++) {
      vec4 r = uR[i];
      float age = uTime - r.z;
      if (age > 0.0 && age < 4.0 && r.w > 0.001) {
        float radius = age * 7.0;
        float d = distance(p, r.xy);
        float w = exp(-pow((d - radius) * 0.9, 2.0)) * exp(-age * 1.3) * r.w;
        ring += w;
        vec2 dir = normalize(p - r.xy + vec2(0.0001, 0.0001));
        samplePos -= dir * w * 0.35;
        tint += w * 0.55;
      }
    }

    vec2 cell = floor(samplePos / 0.7);
    vec2 centre = (cell + 0.5) * 0.7;
    float d = length(samplePos - centre);
    float radius = 0.028 + near * 0.03 + clamp(ring, 0.0, 1.0) * 0.03;
    float mask = 1.0 - smoothstep(radius * 0.5, radius, d);

    vec3 dotColor = mix(uInk, uAccent, clamp(tint, 0.0, 0.55));
    vec3 col = mix(uBase, dotColor, mask * 0.16);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`,ne=4;function ze({palette:t}){const{camera:e}=N(),o=w(l=>l.active),s=w(l=>l.layout),r=n.useMemo(()=>Array.from({length:ne},()=>new he(0,0,-999,0)),[]),a=n.useMemo(()=>new ie({uniforms:{uBase:{value:new U(t.base)},uInk:{value:new U(t.ink)},uAccent:{value:new U(t.accent)},uCursor:{value:new Z},uTime:{value:0},uR:{value:r}},vertexShader:Te,fragmentShader:ke,depthWrite:!0,toneMapped:!1}),[]),c=n.useRef(0),d=n.useRef(0),m=n.useMemo(()=>new ve,[]),v=n.useMemo(()=>new pe(new R(0,0,1),7),[]),p=n.useMemo(()=>new R,[]),x=n.useMemo(()=>new Z,[]),y=n.useRef(new R),g=n.useMemo(()=>new U(t.base),[]),C=(l,f,M)=>{const h=r[c.current%ne];c.current+=1,h.set(l,f,d.current,Math.max(.05,M))};return n.useEffect(()=>{a.uniforms.uInk.value.set(t.ink),a.uniforms.uAccent.value.set(t.accent);const l=z(o);g.set(l.warm?t.alternate:t.base)},[o,t,a,g]),n.useEffect(()=>{const l=z(o),f=$(l.region,s);y.current.set(f.x,f.y,0)},[o,s]),n.useEffect(()=>w.subscribe((l,f)=>{if(l.pulse.id!==f.pulse.id){const M=z(l.active),h=$(M.region,l.layout);C(h.x,h.y,.5+.5*l.pulse.strength)}l.impulse.id!==f.impulse.id&&(x.set(l.impulse.x,l.impulse.y),m.setFromCamera(x,e),m.ray.intersectPlane(v,p)&&C(p.x,p.y,1.2))}),[e]),n.useEffect(()=>()=>a.dispose(),[a]),F((l,f)=>{const M=Math.min(f,.05);d.current=l.clock.elapsedTime;const h=a.uniforms;h.uTime.value=l.clock.elapsedTime,w.getState().reduced?h.uBase.value.copy(g):h.uBase.value.lerp(g,1-Math.exp(-4*M)),x.set(j.x,j.y),m.setFromCamera(x,e),m.ray.intersectPlane(v,p)&&h.uCursor.value.set(p.x,p.y)}),i.jsxs("mesh",{position:[0,0,-7],frustumCulled:!1,children:[i.jsx("planeGeometry",{args:[70,46]}),i.jsx("primitive",{object:a,attach:"material"})]})}function Fe({tier:t,palette:e}){const o=n.useRef(null),s=w(d=>d.active),r=w(d=>d.layout),a=n.useMemo(()=>new R,[]),c=t==="high";return n.useEffect(()=>{const d=z(s),m=$(d.region,r);a.set(m.x,m.y,0)},[s,r,a]),F((d,m)=>{const v=o.current;if(!v)return;const p=Math.min(m,1/20),x=H(),y=Math.min(1,x*1.4),g=j.x*3.2+(a.x-j.x*3.2)*y,C=j.y*2.4+.6+(a.y-(j.y*2.4+.6))*y;v.position.x=A(v.position.x,g,5,p),v.position.y=A(v.position.y,C,5,p),v.position.z=3.2,v.intensity=18+55*x,v.color.set(e.glow)}),i.jsxs(i.Fragment,{children:[i.jsx("ambientLight",{intensity:.85,color:"#fff8f0"}),i.jsx("directionalLight",{position:[-3,5,8],intensity:1.5,color:"#fffaf3",castShadow:c,"shadow-mapSize-width":1024,"shadow-mapSize-height":1024,"shadow-camera-left":-7,"shadow-camera-right":7,"shadow-camera-top":7,"shadow-camera-bottom":-7,"shadow-camera-near":1,"shadow-camera-far":30,"shadow-bias":-4e-4}),i.jsx("pointLight",{ref:o,color:e.glow,distance:16,decay:2,position:[0,.6,3.2],intensity:18}),i.jsxs(ge,{resolution:t==="low"?32:128,frames:1,children:[i.jsx(ee,{form:"rect",intensity:2.2,color:"#ffffff",scale:[8,8,1],position:[0,6,-2],rotation:[-Math.PI/2,0,0]}),i.jsx(ee,{form:"rect",intensity:1.4,color:"#ffe9d2",scale:[6,6,1],position:[-6,2,1],rotation:[0,Math.PI/2,0]}),i.jsx(ee,{form:"rect",intensity:1.1,color:"#d9ecff",scale:[6,6,1],position:[6,1,1],rotation:[0,-Math.PI/2,0]})]}),c?i.jsxs("mesh",{position:[0,0,-1.1],receiveShadow:!0,children:[i.jsx("planeGeometry",{args:[18,12]}),i.jsx("shadowMaterial",{color:"#4a3f35",opacity:.1,transparent:!0})]}):null]})}class Ie{constructor(e){V(this,"canvases");V(this,"textures");V(this,"idx",0);V(this,"scale");this.scale=e,this.canvases=[document.createElement("canvas"),document.createElement("canvas")],this.textures=this.canvases.map(o=>{const s=new ce(o);return s.colorSpace=ue,s.anisotropy=8,s.minFilter=ye,s.magFilter=Me,s.generateMipmaps=!0,s})}init(e){const o=L(this.canvases[0],this.scale,e);return L(this.canvases[1],this.scale,e),this.textures.forEach(s=>s.needsUpdate=!0),this.idx=0,{texture:this.textures[0],info:o}}draw(e){const o=this.textures[this.idx];this.idx=1-this.idx;const s=L(this.canvases[this.idx],this.scale,e);return this.textures[this.idx].needsUpdate=!0,{prev:o,next:this.textures[this.idx],info:s}}redraw(e){const o=L(this.canvases[this.idx],this.scale,e);return this.textures[this.idx].needsUpdate=!0,{texture:this.textures[this.idx],info:o}}redrawBoth(e){const o=L(this.canvases[0],this.scale,e);return L(this.canvases[1],this.scale,e),this.textures.forEach(s=>s.needsUpdate=!0),{texture:this.textures[0],info:o}}dispose(){this.textures.forEach(e=>e.dispose())}}const Ue=`
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Ae=`
  uniform sampler2D uMap;
  uniform sampler2D uPrev;
  uniform float uMix;
  uniform float uPulse;
  uniform vec3 uAccent;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vN;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec3 a = texture2D(uPrev, vUv).rgb;
    vec3 b = texture2D(uMap, vUv).rgb;

    float n = noise(vUv * vec2(7.0, 11.0)) * 0.16;
    float front = uMix * 1.4 - 0.2;
    float edge = (1.0 - vUv.y) + n;
    float k = 1.0 - smoothstep(front - 0.035, front + 0.035, edge);
    float running = step(0.001, uMix) * step(uMix, 0.999);
    float band = (1.0 - smoothstep(0.0, 0.05, abs(edge - front))) * running;

    vec3 col = mix(a, b, k);
    col = mix(col, uAccent, band * 0.4);

    float fe = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    col = mix(col, uAccent, (1.0 - smoothstep(0.0, 0.006, fe)) * uPulse);

    float l = dot(normalize(vN), normalize(uLight));
    col *= 0.965 + 0.035 * l;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;function De(t){return new ie({uniforms:{uMap:{value:null},uPrev:{value:null},uMix:{value:1},uPulse:{value:0},uAccent:{value:new U(t)},uLight:{value:new R(.3,.5,1)}},vertexShader:Ue,fragmentShader:Ae,toneMapped:!1})}const X=.025;function fe(t,e,o){const s=new we,r=-t/2,a=-e/2;return s.moveTo(r+o,a),s.lineTo(r+t-o,a),s.quadraticCurveTo(r+t,a,r+t,a+o),s.lineTo(r+t,a+e-o),s.quadraticCurveTo(r+t,a+e,r+t-o,a+e),s.lineTo(r+o,a+e),s.quadraticCurveTo(r,a+e,r,a+e-o),s.lineTo(r,a+o),s.quadraticCurveTo(r,a,r+o,a),s}function Le(){const t=n.useMemo(()=>{const e=new le(fe(O+.55,W+.55,.09),{depth:.05,bevelEnabled:!1,curveSegments:10});return e.translate(0,0,-.025),e},[]);return n.useEffect(()=>()=>t.dispose(),[t]),i.jsx("mesh",{geometry:t,position:[.12,-.1,-.42],children:i.jsx("meshPhysicalMaterial",{color:"#ffffff",transparent:!0,opacity:.28,roughness:.14,metalness:0,clearcoat:1,clearcoatRoughness:.12})})}function Ge(){const t=n.useMemo(()=>{const e=document.createElement("canvas");e.width=256,e.height=256;const o=e.getContext("2d");if(o){const r=o.createRadialGradient(128,128,6,128,128,124);r.addColorStop(0,"rgba(15, 23, 42, 0.34)"),r.addColorStop(.5,"rgba(15, 23, 42, 0.13)"),r.addColorStop(1,"rgba(15, 23, 42, 0)"),o.fillStyle=r,o.fillRect(0,0,256,256)}const s=new ce(e);return s.colorSpace=ue,s},[]);return n.useEffect(()=>()=>t.dispose(),[t]),i.jsxs("mesh",{position:[.1,-.22,-.9],scale:[O*.92,W*.86,1],children:[i.jsx("planeGeometry",{args:[2,2]}),i.jsx("meshBasicMaterial",{map:t,transparent:!0,depthWrite:!1,opacity:.6})]})}function _e({tier:t,palette:e,reduced:o}){const s=n.useRef(null),{size:r}=N(),a=n.useMemo(()=>new Ie(oe[t==="none"?"low":t].textureScale),[t]),c=n.useMemo(()=>De(e.accent),[]),d=n.useRef(null),m=n.useRef(null),v=n.useRef(o?1:0),p=n.useRef(-1),x=n.useRef({wobble:0,wobbleV:0,mixStart:-1,pulseStart:-1e9,pulseStrength:0}),y=w(f=>f.active),g=w(f=>f.reduced),C=w(f=>f.flip),l=n.useMemo(()=>{const f=new le(fe(O,W,.04),{depth:X,bevelEnabled:!1,curveSegments:12});return f.translate(0,0,-X/2),f},[]);return n.useEffect(()=>()=>l.dispose(),[l]),n.useEffect(()=>()=>c.dispose(),[c]),n.useEffect(()=>()=>a.dispose(),[a]),n.useEffect(()=>{const f=z(w.getState().active).region,{texture:M,info:h}=a.init(f);d.current=f,c.uniforms.uMap.value=M,c.uniforms.uPrev.value=M,c.uniforms.uMix.value=1,c.uniforms.uAccent.value.set(e.accent),w.getState().setLayout(h),w.getState().setReady(!0);let S=!1;return typeof document<"u"&&"fonts"in document&&document.fonts.ready.then(()=>{if(S)return;const P=a.redrawBoth(d.current);c.uniforms.uMap.value=P.texture,c.uniforms.uPrev.value=P.texture,w.getState().setLayout(P.info)}).catch(()=>{}),()=>{S=!0,m.current&&window.clearTimeout(m.current)}},[]),n.useEffect(()=>{c.uniforms.uAccent.value.set(e.accent)},[e.accent,c]),n.useEffect(()=>{C>0&&!g&&(p.current=performance.now())},[C,g]),n.useEffect(()=>{const f=z(y).region;if(!c.uniforms.uMap.value||f===d.current)return;d.current=f,m.current&&window.clearTimeout(m.current);const M=g?0:180;return m.current=window.setTimeout(()=>{const{prev:h,next:S,info:P}=a.draw(f),b=c.uniforms;b.uPrev.value=h,b.uMap.value=S,b.uMix.value=0,x.current.mixStart=performance.now(),x.current.wobbleV+=g?.35:1.1,x.current.pulseStart=performance.now(),x.current.pulseStrength=.55,w.getState().setLayout(P)},M),()=>{m.current&&window.clearTimeout(m.current)}},[y,g,a,c]),n.useEffect(()=>{if(g){v.current=1;return}const f={value:0},M=xe.to(f,{value:1,duration:1.5,delay:.1,ease:"power3.out",onUpdate:()=>{v.current=f.value}});return()=>{M.kill()}},[g]),F((f,M)=>{const h=s.current;if(!h)return;const S=Math.min(M,1/20),P=performance.now(),b=x.current,Y=z(y),J=r.width<768,u=f.clock.elapsedTime,G=v.current,K=H(P);let q=0;if(p.current>=0){const E=Math.min(1,(P-p.current)/1150);q=(E<.5?2*E*E:1-Math.pow(-2*E+2,2)/2)*Math.PI*2,E>=1&&(p.current=-1)}const _=(J?0:-Y.side*.28)+Math.sin(u*.5)*Y.sway+j.x*.38+(1-G)*Math.PI*.6,D=-j.y*.26+Math.sin(u*.7)*.03+b.wobble;h.rotation.y=A(h.rotation.y,_,4,S)+q,h.rotation.x=A(h.rotation.x,D,6,S),h.rotation.z=Math.sin(u*.4)*.012,h.position.y=Math.sin(u*.9)*.06-(1-G)*1.2,h.scale.setScalar(.8+.2*G),b.wobbleV+=(-b.wobble*60-b.wobbleV*7)*S,b.wobble+=b.wobbleV*S;const I=c.uniforms;if(b.mixStart>=0){const E=Math.min(1,(P-b.mixStart)/(g?260:800));I.uMix.value=1-Math.pow(1-E,2),E>=1&&(b.mixStart=-1)}I.uPulse.value=K*.9,I.uLight.value.set(j.x*.9,j.y*.9+.4,1)}),i.jsxs("group",{ref:s,children:[i.jsx(Ge,{}),i.jsx("mesh",{geometry:l,castShadow:!0,children:i.jsx("meshStandardMaterial",{color:e.paper,roughness:.92})}),i.jsxs("mesh",{position:[0,0,X/2+.004],children:[i.jsx("planeGeometry",{args:[O-.02,W-.02]}),i.jsx("primitive",{object:c,attach:"material"})]}),i.jsxs("mesh",{position:[0,0,-X/2-.004],rotation:[0,Math.PI,0],children:[i.jsx("planeGeometry",{args:[O-.02,W-.02]}),i.jsx("meshStandardMaterial",{color:e.paperEdge,roughness:.9})]}),i.jsx(Le,{})]})}function Be({tier:t,reduced:e}){const o=n.useRef(null),s=e?.35:1;return F(r=>{const a=o.current;if(!a)return;const c=r.clock.elapsedTime,d=H(),m=c*.35*s;a.position.x=Math.cos(m)*2.7*s+j.x*.6,a.position.y=Math.sin(c*.5*s)*1.1*s+.2+j.y*.4,a.position.z=Math.sin(m)*1.3*s+1.4,a.scale.setScalar(.55*(1+.35*d))}),i.jsxs("mesh",{ref:o,position:[2.7,.2,1.4],frustumCulled:!1,children:[i.jsx("sphereGeometry",{args:[1,48,48]}),t==="high"?i.jsx(Se,{samples:4,resolution:256,thickness:1.2,roughness:.06,chromaticAberration:.05,anisotropicBlur:.1,ior:1.2,distortion:.1,temporalDistortion:.05,backside:!1,color:"#ffffff"}):i.jsx("meshPhysicalMaterial",{color:"#ffffff",transparent:!0,opacity:.34,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.1})]})}function Ve(t){let e=t>>>0;return()=>{e=e+1831565813>>>0;let o=e;return o=Math.imul(o^o>>>15,o|1),o^=o+Math.imul(o^o>>>7,o|61),((o^o>>>14)>>>0)/4294967296}}function re(t,e,o,s){const r=Ve(e),a=o?.6:1;return Array.from({length:t},()=>{const c=new R((r()*2-1)*10,(r()*2-1)*5.5,-4+r()*5.6);return Math.abs(c.x)<1.9&&Math.abs(c.y)<2.5&&(c.z=-3-r()*1.5),c.z>.8&&(c.x+=Math.sign(c.x||1)*1.5),c.multiplyScalar(a),{home:c,pos:c.clone(),vel:new R,rx:r()*Math.PI*2,ry:r()*Math.PI*2,vx:0,vy:0,scale:(s==="ico"?.14+r()*.3:.2+r()*.3)*(o?.7:1),phase:r()*Math.PI*2}})}function ae({shapes:t,colors:e,geometry:o}){const s=n.useRef(null),{camera:r}=N(),a=n.useMemo(()=>new be,[]),c=n.useMemo(()=>new R,[]),d=n.useMemo(()=>new R,[]),m=n.useMemo(()=>new R,[]),v=n.useMemo(()=>new R,[]),p=n.useMemo(()=>new Z,[]),x=n.useRef(w.getState().impulse.id);return n.useEffect(()=>{const y=s.current;if(!y)return;const g=new U;t.forEach((C,l)=>{g.set(e[l%e.length]),y.setColorAt(l,g)}),y.instanceColor&&(y.instanceColor.needsUpdate=!0)},[e,t]),F((y,g)=>{const C=s.current;if(!C)return;const l=Math.min(g,1/30),f=y.clock.elapsedTime,M=H(),h=y.raycaster,S=h.ray;p.set(j.x,j.y),h.setFromCamera(p,r),c.copy(S.origin),d.copy(S.direction);const P=w.getState().impulse,b=P.id!==x.current;b&&(x.current=P.id,p.set(P.x,P.y),h.setFromCamera(p,r),m.copy(S.origin),v.copy(S.direction)),S.origin.copy(c),S.direction.copy(d);const Y=d.z||1e-4,J=v.z||1e-4;t.forEach((u,G)=>{const K=(u.home.x+Math.sin(f*.4+u.phase)*.28-u.pos.x)*9-u.vel.x*2.6,q=(u.home.y+Math.cos(f*.33+u.phase*1.7)*.34-u.pos.y)*9-u.vel.y*2.6,se=(u.home.z-u.pos.z)*9-u.vel.z*2.6;u.vel.x+=K*l,u.vel.y+=q*l,u.vel.z+=se*l;const _=(u.pos.z-c.z)/Y;if(_>0){const D=c.x+d.x*_,I=c.y+d.y*_,E=u.pos.x-D,B=u.pos.y-I,T=Math.hypot(E,B);if(T<2.1&&T>1e-4){const k=(1-T/2.1)*36;u.vel.x+=E/T*k*l,u.vel.y+=B/T*k*l}}if(b){const D=(u.pos.z-m.z)/J,I=m.x+v.x*D,E=m.y+v.y*D,B=u.pos.x-I,T=u.pos.y-E,k=Math.hypot(B,T);if(k<5.5&&k>1e-4){const Q=(1-k/5.5)*11;u.vel.x+=B/k*Q,u.vel.y+=T/k*Q,u.vel.z+=(Math.random()-.5)*Q,u.vx+=(Math.random()-.5)*7,u.vy+=(Math.random()-.5)*7}}u.pos.x+=u.vel.x*l,u.pos.y+=u.vel.y*l,u.pos.z+=u.vel.z*l,u.vx*=Math.exp(-.9*l),u.vy*=Math.exp(-.9*l),u.rx+=(.25+u.vx)*l,u.ry+=(.2+u.vy)*l,a.position.copy(u.pos),a.rotation.set(u.rx,u.ry,0),a.scale.setScalar(u.scale*(1+.22*M)),a.updateMatrix(),C.setMatrixAt(G,a.matrix)}),C.instanceMatrix.needsUpdate=!0}),i.jsxs("instancedMesh",{ref:s,args:[void 0,void 0,t.length],frustumCulled:!1,children:[o==="ico"?i.jsx("icosahedronGeometry",{args:[1,0]}):i.jsx("torusGeometry",{args:[1,.36,6,14]}),i.jsx("meshStandardMaterial",{roughness:.55,metalness:.05,flatShading:!0})]})}function Oe({tier:t,palette:e,reduced:o}){const s=oe[t==="none"?"low":t],r=n.useMemo(()=>re(s.icos,1337,o,"ico"),[s.icos,o]),a=n.useMemo(()=>re(s.tori,7331,o,"torus"),[s.tori,o]);return i.jsxs("group",{children:[i.jsx(ae,{shapes:r,colors:e.shapeColors,geometry:"ico"}),i.jsx(ae,{shapes:a,colors:e.shapeColors,geometry:"torus"})]})}function We(){const{camera:t,size:e}=N(),o=w(a=>a.active),s=w(a=>a.layout),r=n.useMemo(()=>new Z(0,0),[]);return F((a,c)=>{const d=Math.min(c,.05),m=z(o),v=t,p=Math.tan(te.degToRad(v.fov/2)),x=e.width<768,y=m.dist*(x?1.3:1),g=2*p*y,C=g*Math.max(.25,v.aspect),l=$(m.region,s),f=x?0:m.side*C*m.offset,M=x?g*.2:0;r.x=A(r.x,l.x-f,2.6,d),r.y=A(r.y,l.y-M,2.6,d),t.position.x=r.x+j.x*.22,t.position.y=r.y+j.y*.16,t.position.z=A(t.position.z,y,2.4,d),t.lookAt(r.x,r.y,0),t.updateMatrixWorld()}),null}function Ne({enabled:t}){const e=n.useRef(null),{camera:o}=N();return F(()=>{const s=e.current?.circleOfConfusionMaterial;s&&(s.worldFocusDistance=o.position.z)}),t?i.jsx(je,{multisampling:4,enableNormalPass:!1,children:i.jsx(Ce,{ref:e,worldFocusRange:3.2,bokehScale:2.6,height:540})}):null}function Ye(){return F((t,e)=>Re(Math.min(e,1/20))),null}function Ke({tier:t,palette:e,reduced:o,onLost:s}){const r=n.useMemo(()=>oe[t==="none"?"low":t],[t]),[a,c]=n.useState(1),[d,m]=n.useState(!1),[v,p]=n.useState(()=>Math.min(typeof window>"u"?1:window.devicePixelRatio||1,te.lerp(1,r.dpr,1)));return n.useEffect(()=>{p(Math.min(window.devicePixelRatio||1,te.lerp(1,r.dpr,a)))},[a,r.dpr,d]),n.useEffect(()=>{d&&c(.5)},[d]),i.jsxs(Pe,{flat:!0,dpr:v,shadows:t==="high"?"soft":!1,camera:{fov:35,position:[0,0,9.5],near:.1,far:60},gl:{antialias:t==="medium",powerPreference:"high-performance",alpha:!1,stencil:!1},onCreated:({gl:x})=>{x.setClearColor(new U(e.base),1),x.domElement.addEventListener("webglcontextlost",y=>{y.preventDefault(),s()},{once:!0})},children:[i.jsx("color",{attach:"background",args:[e.base]}),i.jsx(Ye,{}),i.jsx(ze,{palette:e}),i.jsx(Fe,{tier:t,palette:e}),i.jsx(_e,{tier:t,palette:e,reduced:o}),i.jsx(Be,{tier:t,reduced:o}),i.jsx(Oe,{tier:t,palette:e,reduced:o}),i.jsx(We,{}),i.jsx(Ne,{enabled:t==="high"&&!d&&r.postFx}),i.jsx(Ee,{onIncline:({factor:x})=>c(x),onChange:({factor:x})=>c(x),onDecline:({factor:x})=>c(Math.max(.5,x)),onFallback:({factor:x})=>{m(!0),c(Math.min(.5,x))}})]})}export{Ke as default};
