(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function e(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(a){if(a.ep)return;a.ep=!0;const s=e(a);fetch(a.href,s)}})();let U=null,R=null;const K=[],J=[];function P(r){if(typeof r=="number"&&Number.isFinite(r))return!0;if(typeof r!="string")return!1;const t=r.trim();return t.length>0&&!(t.startsWith("__")&&t.endsWith("__"))}async function x(r,t={}){const e=r.startsWith("http://")||r.startsWith("https://")?r:`${Z()}${r}`;return window.sidecar&&typeof window.sidecar.fetch=="function"?window.sidecar.fetch(e,t):fetch(e,t)}function Z(){const r=window.__STUDIO_CONFIG__?.apiBaseUrl;return P(r)?String(r).trim().replace(/\/+$/,""):""}const M=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;function at(){const r=window.sidecar?.conversationId?.trim();if(r&&M.test(r))return r;const t=new URLSearchParams(window.location.search),e=(t.get("conversationId")||t.get("session_id")||t.get("sessionId"))?.trim();if(e&&P(e)&&M.test(e))return e;const n=window.__STUDIO_CONFIG__?.sessionId;if(P(n)){const s=String(n).trim();if(M.test(s))return s}const a=(t.get("file")||t.get("path"))?.trim();if(a){const s=a.replace(/\\/g,"/").match(/\/brain\/([a-zA-Z0-9_-]{1,128})\//);if(s&&s[1]!=="tempmediaStorage"&&M.test(s[1]))return s[1]}return""}function T(){return U===null&&(U=at()),U}function $(){const r=T();return r||null}function Q(r){const t=r.trim();if(!t||!M.test(t))throw new Error(`Invalid session_id "${r}". Must be 1-128 alphanumeric, underscore, or hyphen characters.`);U=t,window.__STUDIO_CONFIG__&&(window.__STUDIO_CONFIG__.sessionId=t);for(const e of K)e(t)}function O(r){Q(r)}function it(r){K.push(r)}function ot(){const t=new URLSearchParams(window.location.search).get("workspace")?.trim();if(t&&P(t))return t;const e=window.__STUDIO_CONFIG__?.workspace;return P(e)?String(e).trim():""}function k(){return R===null&&(R=ot()),R}function q(r){const t=r.trim();R=t,window.__STUDIO_CONFIG__&&(window.__STUDIO_CONFIG__.workspace=t);for(const e of J)e(t)}function rt(r){J.push(r)}function lt(){return new URLSearchParams(window.location.search).get("mode")==="preview"||window.__STUDIO_CONFIG__?.mode==="preview"?"preview":"full"}function G(){const r=window.location.protocol==="http:"||window.location.protocol==="https:"?window.location.origin:Z(),t=T()||"standalone",e=k(),n=new URLSearchParams({mode:"full",conversationId:t}),a=new URLSearchParams(window.location.search).get("token");return a&&n.set("token",a),e&&n.set("workspace",e),`${r}/?${n.toString()}`}async function N(r){const t=await x("/api/workspace/resolve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceUri:r})});if(!t.ok){const e=await t.json().catch(()=>({}));throw new Error(e.error||`Failed to resolve workspace URI: HTTP ${t.status}`)}return await t.json()}async function dt(){const r=await x("/api/health",{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Failed to fetch sidecar health: HTTP ${r.status} ${r.statusText}`);const t=await r.json();return t.activeSessionId&&!T()&&Q(t.activeSessionId),t.defaultWorkspace&&!k()&&q(t.defaultWorkspace),t}let _=!1,D=null;async function ct(){if(window.sidecar?.conversationId&&!$())try{O(window.sidecar.conversationId)}catch{}return!_&&window.sidecar&&typeof window.sidecar.onWorkspaceChange=="function"&&(_=!0,window.sidecar.onWorkspaceChange(r=>{Array.isArray(r)&&r.length>0&&r[0]&&N(r[0]).then(t=>{t.workspace&&q(t.workspace)}).catch(()=>{})})),D||(D=(async()=>{let r=!1;if(window.sidecar&&typeof window.sidecar.getWorkspaceUris=="function")try{const t=await Promise.race([window.sidecar.getWorkspaceUris(),new Promise(e=>setTimeout(()=>e([]),1200))]);if(Array.isArray(t)&&t.length>0&&t[0]){const e=await N(t[0]);e.workspace&&(q(e.workspace),r=!0)}}catch{}try{const t=await dt();if(t.activeSessionId&&!$()&&O(t.activeSessionId),!r&&!k()&&t.defaultWorkspace){const e=await N(t.defaultWorkspace);e.workspace&&q(e.workspace)}}catch{}return k()})().finally(()=>{D=null}),D)}async function ht(){const r=await x("/api/sessions",{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Failed to fetch recent sessions: HTTP ${r.status} ${r.statusText}`);const t=await r.json();return Array.isArray(t.sessions)?t.sessions:[]}async function V(r){const t=r.sessionId||window.sidecar?.conversationId||T()||"standalone",e=r.workspace||k(),n=r.pkg,a=r.filename||`playtest-bug-${Date.now()}.png`,s=await x("/api/send-to-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:t,filename:a,image:r.imageDataUrl,note:r.note||"",consoleLogs:r.consoleLogs||[],workspace:e,pkg:n,metadata:{workspace:e,pkg:n,frameOffset:r.frameOffset??"live",resolution:r.resolution||(r.width&&r.height?`${r.width}x${r.height}`:"canvas"),width:r.width,height:r.height}})}),i=await s.text();let o={};try{o=i?JSON.parse(i):{}}catch{o={error:i}}if(!s.ok)throw new Error(o.error||`Failed to send bug report to chat: HTTP ${s.status} ${s.statusText}`);return o}async function ut(r){const t=r.sessionId||window.sidecar?.conversationId||T()||"standalone",e=r.workspace||k(),n=r.pkg,a=await x("/api/send-to-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:t,buildError:r.buildError,note:r.note||"",workspace:e,pkg:n,metadata:{workspace:e,pkg:n}})}),s=await a.text();let i={};try{i=s?JSON.parse(s):{}}catch{i={error:s}}if(!a.ok)throw new Error(i.error||`Failed to send build error to chat: HTTP ${a.status} ${a.statusText}`);return i}function ft(){const t=document.querySelector(".studio-top-tab.active")?.dataset?.view||"",e=new URLSearchParams(window.location.search),n=(e.get("tab")||"").trim().toLowerCase(),a=t||n||"playtest",s=a==="sound"?"Sound":a==="sprite"||a==="sprites"?"Sprites":"Playtest";let i=(e.get("file")||e.get("path")||"").trim();if(a==="sprite"||a==="sprites"){const d=document.getElementById("spr-active-file-badge")?.getAttribute("title")?.trim()||"";d&&d!=="No sprite loaded"&&(i=d)}else if(a==="sound"){const d=document.getElementById("sound-active-file-label")?.getAttribute("title")?.trim()||"";d&&!/^Untitled\.(sfx|music)$/i.test(d)&&(i=d)}return{tab:s,filePath:i}}async function X(r){const t=r.sessionId||window.sidecar?.conversationId||T()||"standalone",e=r.workspace||k()||".",n=ft(),a=r.tab||n.tab,s=r.filePath??n.filePath,i=r.errorTitle.trim()||"Game Dev Studio Error",o=r.errorDetail&&r.errorDetail.trim()||i,d=await x("/api/send-to-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:t,errorTitle:i,studioError:o,workspace:e,metadata:{workspace:e,tab:a,filePath:s}})}),l=await d.text();let c={};try{c=l?JSON.parse(l):{}}catch{c={error:l}}if(!d.ok)throw new Error(c.error||`Failed to send error to agent: HTTP ${d.status} ${d.statusText}`);return c}class tt extends Error{constructor(t,e=""){super(t),this.detail=e,this.name="PlaytestLaunchError"}}async function pt(r){const t=await x("/api/playtest/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameDir:r||k()})}),e=await t.json().catch(()=>({}));if(!t.ok)throw new tt(e.error||`Failed to start the game: HTTP ${t.status}`,typeof e.detail=="string"?e.detail:"");return e}async function gt(){await x("/api/playtest/stop",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})}class mt{maxFrames;captureIntervalMs;slots;writePtr=0;count=0;sequence=0;lastCaptureTimeMs=-1/0;constructor(t=250,e=40){if(!Number.isInteger(t)||t<1)throw new Error(`[FrameDvrBuffer] Invalid maxFrames=${t}. Must be a positive integer.`);if(!Number.isFinite(e)||e<1)throw new Error(`[FrameDvrBuffer] Invalid captureIntervalMs=${e}. Must be a positive number.`);this.maxFrames=t,this.captureIntervalMs=e,this.slots=new Array(t).fill(null)}get length(){return this.count}shouldCapture(t){return t-this.lastCaptureTimeMs>=this.captureIntervalMs}recordFrame(t,e=performance.now()){if(!t||typeof t.toDataURL!="function"||typeof t.width!="number"||typeof t.height!="number")throw new Error("[FrameDvrBuffer] recordFrame requires a valid canvas element with width, height, and toDataURL().");if(t.width<=0||t.height<=0)throw new Error(`[FrameDvrBuffer] Cannot record frame from zero-sized canvas (${t.width}x${t.height}).`);const n=t.toDataURL("image/png");return this.recordFrameDataUrl(n,t.width,t.height,e)}recordFrameDataUrl(t,e,n,a=performance.now()){if(typeof t!="string"||!t.startsWith("data:image/"))throw new Error("[FrameDvrBuffer] Canvas toDataURL() did not return a valid image data URI.");if(!Number.isFinite(e)||!Number.isFinite(n)||e<=0||n<=0)throw new Error(`[FrameDvrBuffer] Cannot record frame from zero-sized canvas (${e}x${n}).`);const s=++this.sequence,i={frameNumber:s,timestampMs:a,width:e,height:n,dataUrl:t};return this.slots[this.writePtr]=i,this.writePtr=(this.writePtr+1)%this.maxFrames,this.count<this.maxFrames&&this.count++,this.lastCaptureTimeMs=a,{index:this.count-1,frameNumber:s,timestampMs:a,relativeSec:0,width:i.width,height:i.height,dataUrl:i.dataUrl}}recordCanvasSlot(t,e,n,a){const i={frameNumber:++this.sequence,timestampMs:a,width:e,height:n,dataUrl:"",canvas:t};this.slots[this.writePtr]=i,this.writePtr=(this.writePtr+1)%this.maxFrames,this.count<this.maxFrames&&this.count++,this.lastCaptureTimeMs=a}recordFrameIfDue(t,e=performance.now()){return this.shouldCapture(e)?this.recordFrame(t,e):null}createDvrFrameFromSlot(t,e,n){return{index:e,frameNumber:t.frameNumber,timestampMs:t.timestampMs,relativeSec:n,width:t.width,height:t.height,canvas:t.canvas,get dataUrl(){return!t.dataUrl&&t.canvas&&(t.dataUrl=t.canvas.toDataURL("image/png")),t.dataUrl}}}getFrames(){if(this.count===0)return[];const t=this.count<this.maxFrames?0:this.writePtr,e=(t+this.count-1)%this.maxFrames,n=this.slots[e],a=n?n.timestampMs:0,s=new Array(this.count);for(let i=0;i<this.count;i++){const o=(t+i)%this.maxFrames,d=this.slots[o],l=(d.timestampMs-a)/1e3,c=l===0?0:Number(l.toFixed(2));s[i]=this.createDvrFrameFromSlot(d,i,c)}return s}getFrameAt(t){if(!Number.isInteger(t)||t<0||t>=this.count)return null;const e=this.count<this.maxFrames?0:this.writePtr,n=(e+t)%this.maxFrames,a=this.slots[n];if(!a)return null;const s=(e+this.count-1)%this.maxFrames,i=this.slots[s],o=i?i.timestampMs:a.timestampMs,d=(a.timestampMs-o)/1e3,l=d===0?0:Number(d.toFixed(2));return this.createDvrFrameFromSlot(a,t,l)}getLatestFrame(){return this.count===0?null:this.getFrameAt(this.count-1)}clear(){this.slots.fill(null),this.writePtr=0,this.count=0,this.lastCaptureTimeMs=-1/0}}function bt(){const r=new Uint8Array(768);let t=0;const e=(i,o,d)=>{t>=256||(r[t*3]=i,r[t*3+1]=o,r[t*3+2]=d,t++)},n=[0,51,102,153,204,255];for(let i=0;i<6;i++)for(let o=0;o<6;o++)for(let d=0;d<6;d++)e(n[i],n[o],n[d]);for(let i=0;i<24;i++){const o=Math.round(8+i*238/23);e(o,o,o)}const a=[[239,68,68],[250,204,21],[6,182,212],[34,197,94],[255,255,255],[9,13,22],[11,15,26],[16,23,38],[20,12,14],[56,189,248],[244,63,94],[168,85,247],[16,185,129],[245,158,11],[99,102,241],[236,72,153]];for(const[i,o,d]of a)e(i,o,d);const s=new Uint8Array(32768);for(let i=0;i<32;i++){const o=i<<3|i>>2;for(let d=0;d<32;d++){const l=d<<3|d>>2;for(let c=0;c<32;c++){const h=c<<3|c>>2;let u=0,f=1/0;for(let g=0;g<256;g++){const m=r[g*3],y=r[g*3+1],v=r[g*3+2],w=o-m,S=l-y,p=h-v,b=w*w*2+S*S*4+p*p;if(b<f&&(f=b,u=g,b===0))break}s[i<<10|d<<5|c]=u}}}return{palette:r,lut15:s}}let H=null;function yt(){return H||(H=bt()),H}class vt{buf;length=0;constructor(t=262144){this.buf=new Uint8Array(t)}ensure(t){const e=this.length+t;if(e<=this.buf.length)return;let n=this.buf.length*2;for(;n<e;)n*=2;const a=new Uint8Array(n);a.set(this.buf.subarray(0,this.length)),this.buf=a}writeByte(t){this.ensure(1),this.buf[this.length++]=t&255}writeUint16LE(t){this.ensure(2),this.buf[this.length++]=t&255,this.buf[this.length++]=t>>8&255}writeBytes(t){this.ensure(t.length),this.buf.set(t,this.length),this.length+=t.length}writeAscii(t){this.ensure(t.length);for(let e=0;e<t.length;e++)this.buf[this.length++]=t.charCodeAt(e)&255}toUint8Array(){return this.buf.slice(0,this.length)}}function wt(r,t,e){r.writeByte(8);let i=9,o=258,d=(1<<i)-1;e.fill(-1);const l=new Uint8Array(255);let c=0,h=0,u=0;const f=()=>{c>0&&(r.writeByte(c),r.writeBytes(l.subarray(0,c)),c=0)},g=m=>{for(h|=m<<u,u+=i;u>=8;)l[c++]=h&255,c===255&&f(),h>>=8,u-=8};if(g(256),t.length>0){let m=t[0];for(let y=1;y<t.length;y++){const v=t[y],w=m<<8|v,S=e[w];S!==-1?m=S:(g(m),o<4096?(e[w]=o,o>d&&i<12&&(i++,d=(1<<i)-1),o++):(g(256),e.fill(-1),i=9,o=258,d=(1<<i)-1),m=v)}g(m)}g(257),u>0&&(l[c++]=h&255),f(),r.writeByte(0)}function St(r){const{width:t,height:e,frames:n}=r;if(!Number.isInteger(t)||!Number.isInteger(e)||t<=0||e<=0)throw new Error(`[GifEncoder] Invalid GIF dimensions: ${t}x${e}.`);if(!Array.isArray(n)||n.length===0)throw new Error("[GifEncoder] encodeAnimatedGif requires at least 1 frame.");const a=t*e*4;for(let h=0;h<n.length;h++){const u=n[h];if(!u||!u.rgba||u.rgba.length!==a)throw new Error(`[GifEncoder] Frame ${h} RGBA length (${u?.rgba?.length??0}) does not match ${t}x${e}x4 (${a}).`)}const{palette:s,lut15:i}=yt(),o=new vt(Math.max(65536,t*e*Math.min(n.length,8)));o.writeAscii("GIF89a"),o.writeUint16LE(t),o.writeUint16LE(e),o.writeByte(247),o.writeByte(0),o.writeByte(0),o.writeBytes(s),o.writeBytes([33,255,11,78,69,84,83,67,65,80,69,50,46,48,3,1,0,0,0]);const d=t*e,l=new Uint8Array(d),c=new Int32Array(4096*256);for(let h=0;h<n.length;h++){const u=n[h],f=u.rgba,g=Math.max(2,Math.round((u.delayMs||66)/10));for(let m=0,y=0;m<d;m++,y+=4){const v=f[y]>>3,w=f[y+1]>>3,S=f[y+2]>>3;l[m]=i[v<<10|w<<5|S]}o.writeBytes([33,249,4,0]),o.writeUint16LE(g),o.writeBytes([0,0]),o.writeByte(44),o.writeUint16LE(0),o.writeUint16LE(0),o.writeUint16LE(t),o.writeUint16LE(e),o.writeByte(0),wt(o,l,c)}return o.writeByte(59),o.toUint8Array()}function et(r,t,e){if(t<=0||e<=0||r.length<t*e*4)return{x:0,y:0,width:Math.max(1,t),height:Math.max(1,e)};const n=(t*e-1)*4,a=r[3],s=r[n+3],i=a===0||s===0,o=r[0],d=r[1],l=r[2],c=!i&&o<=12&&d<=16&&l<=26&&Math.abs(r[n]-o)<=2&&Math.abs(r[n+1]-d)<=2&&Math.abs(r[n+2]-l)<=2,h=p=>{const b=r[p+3];return i?b>16:c?b>16&&(Math.abs(r[p]-o)>2||Math.abs(r[p+1]-d)>2||Math.abs(r[p+2]-l)>2):b>16&&(r[p]>0||r[p+1]>0||r[p+2]>0)};let u=0,f=!1;for(let p=0;p<e;p++){const b=p*t*4;for(let E=0;E<t;E+=2)if(h(b+E*4)){u=p,f=!0;break}if(f)break}if(!f)return{x:0,y:0,width:t,height:e};let g=e-1;for(let p=e-1;p>=u;p--){const b=p*t*4;let E=!1;for(let L=0;L<t;L+=2)if(h(b+L*4)){g=p,E=!0;break}if(E)break}let m=0,y=!1;for(let p=0;p<t;p++){for(let b=u;b<=g;b+=2)if(h((b*t+p)*4)){m=p,y=!0;break}if(y)break}let v=t-1;for(let p=t-1;p>=m;p--){let b=!1;for(let E=u;E<=g;E+=2)if(h((E*t+p)*4)){v=p,b=!0;break}if(b)break}const w=v-m+1,S=g-u+1;return w<64||S<36?{x:0,y:0,width:t,height:e}:{x:m,y:u,width:w,height:S}}function Et(r){const e=[];for(let a=0;a<r.length;a+=32768){const s=r.subarray(a,a+32768);e.push(String.fromCharCode(...s))}const n=e.join("");return`data:image/gif;base64,${btoa(n)}`}const nt=[{name:"Red",hex:"#EF4444"},{name:"Yellow",hex:"#FACC15"},{name:"Cyan",hex:"#06B6D4"},{name:"Lime",hex:"#22C55E"},{name:"White",hex:"#FFFFFF"}];function Ct(r,t){const e=r.replace(/^#/,"").trim();if(e.length===3){const n=parseInt(e[0]+e[0],16),a=parseInt(e[1]+e[1],16),s=parseInt(e[2]+e[2],16);return`rgba(${n}, ${a}, ${s}, ${t})`}if(e.length===6){const n=parseInt(e.slice(0,2),16),a=parseInt(e.slice(2,4),16),s=parseInt(e.slice(4,6),16);return`rgba(${n}, ${a}, ${s}, ${t})`}return`rgba(239, 68, 68, ${t})`}function st(r){return r.type==="pen"?{...r,points:r.points.map(t=>({x:t.x,y:t.y}))}:{...r}}function I(r){return r.map(st)}class kt{baseCanvas;overlayCanvas;onHistoryChange;activeTool="box";activeColor=nt[0].hex;strokeWidth=3;shapes=[];undoStack=[];redoStack=[];isDrawing=!1;draftShape=null;shapeCounter=0;activeTextInputEl=null;width;height;hasBaseSnapshot=!1;constructor(t={}){this.baseCanvas=t.baseCanvas??null,this.overlayCanvas=t.overlayCanvas??null,this.onHistoryChange=t.onHistoryChange??null,this.width=t.width??(this.baseCanvas?.width||640),this.height=t.height??(this.baseCanvas?.height||360),this.baseCanvas&&(this.baseCanvas.width=this.width,this.baseCanvas.height=this.height),this.overlayCanvas&&(this.overlayCanvas.width=this.width,this.overlayCanvas.height=this.height,this.bindPointerEvents(this.overlayCanvas))}getTool(){return this.activeTool}setTool(t){this.commitOrCloseActiveTextInput(),this.activeTool=t}getColor(){return this.activeColor}setColor(t){if(!t||typeof t!="string")throw new Error("[BugAnnotator] Invalid color value.");this.activeColor=t}getDimensions(){return{width:this.width,height:this.height}}setDimensions(t,e){if(t<=0||e<=0)throw new Error(`[BugAnnotator] Invalid dimensions: ${t}x${e}`);this.width=t,this.height=e,this.baseCanvas&&(this.baseCanvas.width!==t||this.baseCanvas.height!==e)&&(this.baseCanvas.width=t,this.baseCanvas.height=e),this.overlayCanvas&&(this.overlayCanvas.width!==t||this.overlayCanvas.height!==e)&&(this.overlayCanvas.width=t,this.overlayCanvas.height=e),this.renderOverlay()}getShapes(){return I(this.shapes)}canUndo(){return this.undoStack.length>0}canRedo(){return this.redoStack.length>0}addShape(t){this.undoStack.push(I(this.shapes)),this.redoStack=[],this.shapes.push(st(t)),this.renderOverlay(),this.notifyHistoryChange()}addTextAnnotation(t,e,n){const a=n.trim();if(!a)return null;const s={id:this.nextShapeId(),type:"text",color:this.activeColor,x:Math.round(t),y:Math.round(e),text:a};return this.addShape(s),s}undo(){if(this.undoStack.length===0)return!1;this.commitOrCloseActiveTextInput(),this.redoStack.push(I(this.shapes));const t=this.undoStack.pop();return this.shapes=I(t),this.renderOverlay(),this.notifyHistoryChange(),!0}redo(){if(this.redoStack.length===0)return!1;this.commitOrCloseActiveTextInput(),this.undoStack.push(I(this.shapes));const t=this.redoStack.pop();return this.shapes=I(t),this.renderOverlay(),this.notifyHistoryChange(),!0}clearAnnotations(){this.commitOrCloseActiveTextInput(),this.shapes.length!==0&&(this.undoStack.push(I(this.shapes)),this.redoStack=[],this.shapes=[],this.draftShape=null,this.renderOverlay(),this.notifyHistoryChange())}resetHistory(){this.commitOrCloseActiveTextInput(),this.shapes=[],this.undoStack=[],this.redoStack=[],this.draftShape=null,this.renderOverlay(),this.notifyHistoryChange()}loadBaseFromCanvas(t){if(!this.baseCanvas)throw new Error("[BugAnnotator] No baseCanvas configured to receive snapshot.");t.width>0&&t.height>0&&this.setDimensions(t.width,t.height);const e=this.baseCanvas.getContext("2d");if(!e)throw new Error("[BugAnnotator] Failed to acquire 2D context on baseCanvas.");e.clearRect(0,0,this.width,this.height),e.drawImage(t,0,0,this.width,this.height),this.hasBaseSnapshot=!0,this.renderOverlay()}loadBaseFrameDataUrl(t,e,n){if(!this.baseCanvas)throw new Error("[BugAnnotator] No baseCanvas configured to load frame data URL.");if(!t||!t.startsWith("data:image/"))throw new Error("[BugAnnotator] Invalid image dataUrl passed to loadBaseFrameDataUrl.");return new Promise((a,s)=>{const i=new Image;i.onload=()=>{const o=e&&e>0?e:i.naturalWidth||this.width,d=n&&n>0?n:i.naturalHeight||this.height;this.setDimensions(o,d);const l=this.baseCanvas.getContext("2d");if(!l){s(new Error("[BugAnnotator] Failed to acquire 2D context on baseCanvas."));return}l.clearRect(0,0,o,d),l.drawImage(i,0,0,o,d),this.hasBaseSnapshot=!0,this.renderOverlay(),a()},i.onerror=()=>{s(new Error("[BugAnnotator] Failed to decode DVR frame dataUrl into Image."))},i.src=t})}hasFrozenFrame(){return this.hasBaseSnapshot}renderOverlay(){if(!this.overlayCanvas)return;const t=this.overlayCanvas.getContext("2d");if(t){t.clearRect(0,0,this.overlayCanvas.width,this.overlayCanvas.height);for(const e of this.shapes)this.renderShape(t,e);this.draftShape&&this.renderShape(t,this.draftShape)}}renderShape(t,e){if(t.save(),e.type==="pen"){if(e.points.length>0){t.beginPath(),t.strokeStyle="rgba(0, 0, 0, 0.7)",t.lineWidth=e.strokeWidth+2.5,t.lineCap="round",t.lineJoin="round",t.moveTo(e.points[0].x,e.points[0].y);for(let n=1;n<e.points.length;n++)t.lineTo(e.points[n].x,e.points[n].y);e.points.length===1&&t.lineTo(e.points[0].x+.5,e.points[0].y+.5),t.stroke(),t.beginPath(),t.strokeStyle=e.color,t.lineWidth=e.strokeWidth,t.lineCap="round",t.lineJoin="round",t.moveTo(e.points[0].x,e.points[0].y);for(let n=1;n<e.points.length;n++)t.lineTo(e.points[n].x,e.points[n].y);e.points.length===1&&t.lineTo(e.points[0].x+.5,e.points[0].y+.5),t.stroke()}}else if(e.type==="arrow"){const n=e.endX-e.startX,a=e.endY-e.startY;if(Math.hypot(n,a)>=2){const i=Math.atan2(a,n),o=Math.max(12,e.strokeWidth*4.5),d=Math.PI/6.5,l=e.endX-o*Math.cos(i-d),c=e.endY-o*Math.sin(i-d),h=e.endX-o*Math.cos(i+d),u=e.endY-o*Math.sin(i+d);t.beginPath(),t.strokeStyle="rgba(0, 0, 0, 0.72)",t.lineWidth=e.strokeWidth+2.5,t.lineCap="round",t.moveTo(e.startX,e.startY),t.lineTo(e.endX-o*.55*Math.cos(i),e.endY-o*.55*Math.sin(i)),t.stroke(),t.beginPath(),t.strokeStyle=e.color,t.lineWidth=e.strokeWidth,t.lineCap="round",t.moveTo(e.startX,e.startY),t.lineTo(e.endX-o*.55*Math.cos(i),e.endY-o*.55*Math.sin(i)),t.stroke(),t.beginPath(),t.moveTo(e.endX,e.endY),t.lineTo(l,c),t.lineTo(h,u),t.closePath(),t.fillStyle=e.color,t.strokeStyle="rgba(0, 0, 0, 0.75)",t.lineWidth=1.5,t.stroke(),t.fill()}}else if(e.type==="box"){const n=e.width>=0?e.x:e.x+e.width,a=e.height>=0?e.y:e.y+e.height,s=Math.abs(e.width),i=Math.abs(e.height);(s>=1||i>=1)&&(t.fillStyle=Ct(e.color,.14),t.fillRect(n,a,s,i),t.strokeStyle="rgba(0, 0, 0, 0.7)",t.lineWidth=e.strokeWidth+2,t.strokeRect(n,a,s,i),t.strokeStyle=e.color,t.lineWidth=e.strokeWidth,t.strokeRect(n,a,s,i))}else if(e.type==="text"){const n='600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';t.font=n;const a=t.measureText(e.text),s=8,i=5,o=Math.ceil(a.width)+s*2,d=24,l=Math.max(4,Math.min(this.width-o-4,e.x)),c=Math.max(4,Math.min(this.height-d-4,e.y-d/2));t.fillStyle="rgba(9, 13, 22, 0.9)",t.strokeStyle=e.color,t.lineWidth=2,t.beginPath(),typeof t.roundRect=="function"?t.roundRect(l,c,o,d,6):t.rect(l,c,o,d),t.fill(),t.stroke(),t.fillStyle="#FFFFFF",t.textBaseline="middle",t.fillText(e.text,l+s,c+d/2+i*.05)}t.restore()}exportCompositeDataUrl(t){const e=t??(typeof document<"u"?document.createElement("canvas"):null);if(!e)throw new Error("[BugAnnotator] Cannot export composite image without a DOM document or customOffscreenCanvas.");e.width=this.width,e.height=this.height;const n=e.getContext("2d");if(!n)throw new Error("[BugAnnotator] Failed to acquire 2D context for composite export.");this.baseCanvas?n.drawImage(this.baseCanvas,0,0,this.width,this.height):(n.fillStyle="#090D16",n.fillRect(0,0,this.width,this.height));for(const a of this.shapes)this.renderShape(n,a);return e.toDataURL("image/png")}exportSmartComposite(t){const e=t??(typeof document<"u"?document.createElement("canvas"):null);if(!e)throw new Error("[BugAnnotator] Cannot export composite image without a DOM document or customOffscreenCanvas.");let n={x:0,y:0,width:this.width,height:this.height};if(this.baseCanvas&&typeof this.baseCanvas.getContext=="function"){const d=this.baseCanvas.getContext("2d");if(d&&typeof d.getImageData=="function"){const l=d.getImageData(0,0,this.width,this.height);n=et(l.data,this.width,this.height)}}const a=xt(this.shapes,this.width,this.height),s=Lt(n,a,this.width,this.height);e.width=s.width,e.height=s.height;const i=e.getContext("2d");if(!i)throw new Error("[BugAnnotator] Failed to acquire 2D context for smart composite export.");typeof i.fillRect=="function"&&(s.x<n.x||s.y<n.y||s.x+s.width>n.x+n.width||s.y+s.height>n.y+n.height||!this.baseCanvas)&&(i.fillStyle="#090D16",i.fillRect(0,0,s.width,s.height)),this.baseCanvas&&(s.x===0&&s.y===0&&s.width===this.width&&s.height===this.height?i.drawImage(this.baseCanvas,0,0,this.width,this.height):i.drawImage(this.baseCanvas,s.x,s.y,s.width,s.height,0,0,s.width,s.height));const o=(s.x!==0||s.y!==0)&&typeof i.translate=="function";o&&(i.save(),i.translate(-s.x,-s.y));for(const d of this.shapes)this.renderShape(i,d);return o&&i.restore(),{dataUrl:e.toDataURL("image/png"),width:s.width,height:s.height,crop:s}}bindPointerEvents(t){const e=a=>{const s=t.getBoundingClientRect(),i=s.width>0?t.width/s.width:1,o=s.height>0?t.height/s.height:1;return{x:(a.clientX-s.left)*i,y:(a.clientY-s.top)*o}};t.addEventListener("pointerdown",a=>{if(a.button!==0)return;a.preventDefault();const s=e(a);if(this.activeTool==="text"){this.openInlineTextInput(s.x,s.y,a.clientX,a.clientY);return}this.commitOrCloseActiveTextInput(),this.isDrawing=!0;try{t.setPointerCapture(a.pointerId)}catch{}const i=this.nextShapeId();this.activeTool==="pen"?this.draftShape={id:i,type:"pen",color:this.activeColor,strokeWidth:this.strokeWidth,points:[s]}:this.activeTool==="arrow"?this.draftShape={id:i,type:"arrow",color:this.activeColor,strokeWidth:this.strokeWidth,startX:s.x,startY:s.y,endX:s.x,endY:s.y}:this.activeTool==="box"&&(this.draftShape={id:i,type:"box",color:this.activeColor,strokeWidth:this.strokeWidth,x:s.x,y:s.y,width:0,height:0}),this.renderOverlay()}),t.addEventListener("pointermove",a=>{if(!this.isDrawing||!this.draftShape)return;const s=e(a);this.draftShape.type==="pen"?this.draftShape.points.push(s):this.draftShape.type==="arrow"?(this.draftShape.endX=s.x,this.draftShape.endY=s.y):this.draftShape.type==="box"&&(this.draftShape.width=s.x-this.draftShape.x,this.draftShape.height=s.y-this.draftShape.y),this.renderOverlay()});const n=a=>{if(!this.isDrawing||!this.draftShape)return;this.isDrawing=!1;try{t.hasPointerCapture(a.pointerId)&&t.releasePointerCapture(a.pointerId)}catch{}const s=this.draftShape;if(this.draftShape=null,s.type==="pen"){let i=1/0,o=-1/0,d=1/0,l=-1/0;for(const c of s.points)c.x<i&&(i=c.x),c.x>o&&(o=c.x),c.y<d&&(d=c.y),c.y>l&&(l=c.y);if(Math.hypot(o-i,l-d)<3){this.renderOverlay();return}}else if(s.type==="arrow"){if(Math.hypot(s.endX-s.startX,s.endY-s.startY)<4){this.renderOverlay();return}}else if(s.type==="box"&&Math.abs(s.width)<3&&Math.abs(s.height)<3){this.renderOverlay();return}this.addShape(s)};t.addEventListener("pointerup",n),t.addEventListener("pointercancel",n)}openInlineTextInput(t,e,n,a){if(this.commitOrCloseActiveTextInput(),!this.overlayCanvas||!this.overlayCanvas.parentElement)return;const s=this.overlayCanvas.parentElement,i=s.getBoundingClientRect(),o=document.createElement("input");o.type="text",o.className="annotation-inline-text-input",o.placeholder="Type bug label & press Enter...",o.style.position="absolute",o.style.left=`${Math.max(8,Math.min(i.width-180,n-i.left))}px`,o.style.top=`${Math.max(8,Math.min(i.height-34,a-i.top-14))}px`,o.style.zIndex="50",o.style.background="rgba(9, 13, 22, 0.95)",o.style.color="#FFFFFF",o.style.border=`2px solid ${this.activeColor}`,o.style.borderRadius="6px",o.style.padding="4px 8px",o.style.fontSize="12px",o.style.fontWeight="600",o.style.outline="none",o.style.minWidth="160px",o.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.45)";let d=!1;const l=()=>{if(d)return;d=!0;const h=o.value.trim();o.parentElement&&o.remove(),this.activeTextInputEl===o&&(this.activeTextInputEl=null),h&&this.addTextAnnotation(t,e,h)},c=()=>{d||(d=!0,o.parentElement&&o.remove(),this.activeTextInputEl===o&&(this.activeTextInputEl=null))};o.addEventListener("keydown",h=>{h.stopPropagation(),h.key==="Enter"?(h.preventDefault(),l()):h.key==="Escape"&&(h.preventDefault(),c())}),o.addEventListener("blur",()=>{l()}),this.activeTextInputEl=o,s.appendChild(o),requestAnimationFrame(()=>o.focus())}commitOrCloseActiveTextInput(){this.activeTextInputEl&&(this.activeTextInputEl.blur(),this.activeTextInputEl=null)}nextShapeId(){return`ann-${++this.shapeCounter}-${Date.now()}`}notifyHistoryChange(){this.onHistoryChange&&this.onHistoryChange()}}function xt(r,t,e,n=12){if(!r||r.length===0||t<=0||e<=0)return null;let a=1/0,s=1/0,i=-1/0,o=-1/0;const d=(f,g,m,y,v)=>{const w=Math.min(f,m)-v,S=Math.max(f,m)+v,p=Math.min(g,y)-v,b=Math.max(g,y)+v;w<a&&(a=w),p<s&&(s=p),S>i&&(i=S),b>o&&(o=b)};for(const f of r)if(f.type==="pen"){const g=(f.strokeWidth||3)+4+n;for(const m of f.points)d(m.x,m.y,m.x,m.y,g)}else if(f.type==="arrow"){const g=Math.max(16,(f.strokeWidth||3)*4.5)+n;d(f.startX,f.startY,f.endX,f.endY,g)}else if(f.type==="box"){const g=(f.strokeWidth||3)+4+n;d(f.x,f.y,f.x+f.width,f.y+f.height,g)}else if(f.type==="text"){const g=Math.ceil((f.text||"").length*8.5)+16,m=24,y=Math.max(4,Math.min(t-g-4,f.x)),v=Math.max(4,Math.min(e-m-4,f.y-m/2));d(y,v,y+g,v+m,4+n)}if(!Number.isFinite(a)||!Number.isFinite(s))return null;const l=Math.max(0,Math.floor(a)),c=Math.max(0,Math.floor(s)),h=Math.min(t,Math.ceil(i)),u=Math.min(e,Math.ceil(o));return{x:l,y:c,width:Math.max(1,h-l),height:Math.max(1,u-c)}}function Lt(r,t,e,n){if(!t)return r;const a=Math.max(0,Math.min(r.x,t.x)),s=Math.max(0,Math.min(r.y,t.y)),i=Math.min(e,Math.max(r.x+r.width,t.x+t.width)),o=Math.min(n,Math.max(r.y+r.height,t.y+t.height));return{x:a,y:s,width:Math.max(1,i-a),height:Math.max(1,o-s)}}const Y=200,z=15e3;class It{container;dvrBuffer;callbacks;iframe=null;currentRunnerId=0;activeMessageHandler=null;paused=!1;muted=!1;focused=!1;running=!1;consoleLogs=[];constructor(t,e,n={}){this.container=t,this.dvrBuffer=e,this.callbacks=n}isRunning(){return this.running}isPaused(){return this.paused}isMuted(){return this.muted}isFocused(){return this.focused}getConsoleLogs(){return[...this.consoleLogs]}clearConsoleLogs(){this.consoleLogs=[]}origin="";cancelLaunch;async connect(t){const e=new URL(t);if(!(e.protocol==="http:"&&["localhost","127.0.0.1"].includes(e.hostname))||e.username||e.password||e.origin===location.origin)throw new Error("Enter the loopback HTTP address printed by playtest-phaser.mjs.");this.destroy(),this.dvrBuffer.clear(),this.clearConsoleLogs(),this.paused=!1,this.callbacks.onStateChange?.("loading"),this.origin=e.origin,await this.mountGame(e)}postToChild(t){this.iframe?.contentWindow&&this.iframe.contentWindow.postMessage({source:"playtest-runner-parent",runnerId:this.currentRunnerId,...t},this.origin)}mountGame(t){return new Promise((e,n)=>{const a=++this.currentRunnerId;let s=!1;const i=window.setTimeout(()=>{s||(s=!0,this.callbacks.onStateChange?.("error"),n(new Error(`[PhaserRunner] Timed out after ${z}ms waiting for a Phaser frame. Start the game using scripts/playtest-phaser.mjs.`)))},z);this.cancelLaunch=()=>{window.clearTimeout(i),s||n(new Error("Playtest disconnected")),s=!0};const o=l=>{const c=l.data;if(!(l.source!==this.iframe?.contentWindow||l.origin!==this.origin)&&!(c?.source!=="playtest-runner-child"||c.runnerId!==a))switch(c.type){case"READY":{this.running=!0,this.callbacks.onStateChange?.("running"),s||(s=!0,window.clearTimeout(i),e());break}case"FRAME":{if(typeof c.dataUrl=="string"&&typeof c.width=="number"&&typeof c.height=="number"&&c.width>0&&c.height>0)try{this.dvrBuffer.recordFrameDataUrl(c.dataUrl,c.width,c.height,c.timestampMs??performance.now()),this.callbacks.onFrameRecorded?.()}catch(h){console.error("[PhaserRunner] Frame DVR capture error:",h)}break}case"LOG":{const h=c.level||"log";this.appendLog(h,c.text||"");break}case"PANIC":{const h=c.message||"Unknown game error";this.appendLog("error",h),s?this.callbacks.onPanic?.(h,this.getConsoleLogs()):(s=!0,window.clearTimeout(i),n(new Error(h)));break}case"TOGGLE_PAUSE":{this.togglePause();break}case"FOCUS_CHANGE":{const h=!!c.focused;this.focused=h,this.callbacks.onFocusChange?.(h);break}}};this.activeMessageHandler=o,window.addEventListener("message",o),t.searchParams.set("studioRunner",String(a)),t.searchParams.set("studioOrigin",location.origin),t.searchParams.set("muted",this.muted?"1":"0");const d=document.createElement("iframe");d.className="game-runner-iframe",d.setAttribute("title","Phaser Playtest Viewport"),d.src=t.href,this.container.innerHTML="",this.container.appendChild(d),this.iframe=d})}setPaused(t){!this.running||this.paused===t||(this.paused=t,this.postToChild({type:"SET_PAUSED",paused:t}),this.callbacks.onPauseChange?.(t),this.callbacks.onStateChange?.(t?"paused":"running"))}togglePause(){return this.running?(this.setPaused(!this.paused),this.paused):!1}setMuted(t){this.muted=t,this.postToChild({type:"SET_MUTED",muted:t})}toggleMuted(){return this.setMuted(!this.muted),this.muted}focus(){try{this.iframe?.contentWindow?.focus()}catch{}this.postToChild({type:"FOCUS_GAME"})}dispatchVirtualKey(t,e,n){this.postToChild({type:"DISPATCH_KEY",code:t,key:e,keyEventType:n})}destroy(){this.cancelLaunch?.(),this.cancelLaunch=void 0,this.activeMessageHandler&&(window.removeEventListener("message",this.activeMessageHandler),this.activeMessageHandler=null),this.running=!1,this.paused=!1,this.focused=!1,this.iframe&&(this.iframe.src="about:blank",this.iframe.remove(),this.iframe=null),this.container.innerHTML="",this.callbacks.onFocusChange?.(!1)}appendLog(t,e){const a=`[${new Date().toISOString().slice(11,23)}] [${t.toUpperCase()}] ${e}`;this.consoleLogs.push(a),this.consoleLogs.length>Y&&this.consoleLogs.splice(0,this.consoleLogs.length-Y),this.callbacks.onLog?.(t,a,this.getConsoleLogs())}}class C{static container=null;static getContainer(){return this.container||(this.container=document.createElement("div"),this.container.className="notification-container",document.body.appendChild(this.container)),this.container}static show(t,e="info",n=4e3,a){const s=this.getContainer(),i=document.createElement("div");i.className=`notification-toast toast-${e}`;const o=document.createElement("span");o.className="toast-icon",o.textContent=e==="success"?"✓":e==="error"?"⚠️":"ℹ";const d=document.createElement("div");d.className="toast-message";const l=document.createElement("div");if(l.className="toast-title",l.textContent=t,d.appendChild(l),a){const h=document.createElement("pre");h.className="toast-detail",h.textContent=a,d.appendChild(h)}if(e==="error"){const h=document.createElement("div");h.className="toast-actions";const u=document.createElement("button");u.type="button",u.className="toast-send-agent-btn",u.textContent="💬 Send to Agent",u.title="Send this error directly to the active Antigravity agent for diagnosis",u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="Sending...";try{await X({errorTitle:t,errorDetail:a||t}),u.textContent="✓ Sent to Agent",u.classList.add("sent")}catch(f){u.disabled=!1,u.textContent="💬 Retry Send to Agent",console.error("[StudioNotifier] Failed to send error to agent:",f)}}),h.appendChild(u),d.appendChild(h)}const c=document.createElement("button");c.className="toast-close",c.textContent="✕",c.title="Dismiss",c.onclick=()=>i.remove(),i.appendChild(o),i.appendChild(d),i.appendChild(c),s.appendChild(i),n>0&&setTimeout(()=>{i.classList.add("toast-fade-out"),setTimeout(()=>i.remove(),280)},n)}static info(t,e=3e3){this.show(t,"info",e)}static success(t,e=3800){this.show(t,"success",e)}static error(t,e){console.error("[Game Dev Studio Error]",t,e||""),this.show(t,"error",0,e)}static fatal(t,e,n){console.error("[Game Dev Studio FATAL]",t,e,n??"");const a=document.getElementById("fatal-error-overlay");a&&a.remove();const s=document.createElement("div");s.id="fatal-error-overlay",s.className="modal-overlay fatal-overlay",s.setAttribute("role","alertdialog"),s.setAttribute("aria-modal","true");const i=e instanceof Error?`${e.name}: ${e.message}`:String(e),o=e instanceof Error&&e.stack?e.stack:"",d=[n?`[Context] ${n}`:"",i,o&&o!==i?o:""].filter(Boolean).join(`

`);s.innerHTML=`
      <div class="fatal-dialog">
        <div class="fatal-icon">🚨</div>
        <h2 class="fatal-title"></h2>
        <p class="fatal-desc">A critical error occurred in Game Dev Studio. Failed fast with full diagnostics:</p>
        <pre class="fatal-pre"></pre>
        <div class="fatal-actions">
          <button type="button" class="btn btn-send-chat" id="fatal-send-agent-btn">💬 Send to Agent</button>
          <button type="button" class="btn btn-danger" id="fatal-reload-btn">Reload Studio</button>
          <button type="button" class="btn btn-outline" id="fatal-dismiss-btn">Dismiss (Esc)</button>
        </div>
      </div>
    `;const l=s.querySelector(".fatal-title");l&&(l.textContent=t);const c=s.querySelector(".fatal-pre");c&&(c.textContent=d);const h=()=>{window.removeEventListener("keydown",u),s.remove()},u=g=>{g.key==="Escape"&&(g.preventDefault(),h())};window.addEventListener("keydown",u);const f=s.querySelector("#fatal-send-agent-btn");f?.addEventListener("click",async()=>{if(f){f.disabled=!0,f.textContent="Sending...";try{await X({errorTitle:t,errorDetail:d}),f.textContent="✓ Sent to Agent"}catch(g){f.disabled=!1,f.textContent="💬 Retry Send to Agent",console.error("[StudioNotifier] Failed to send fatal error to agent:",g)}}}),s.querySelector("#fatal-reload-btn")?.addEventListener("click",()=>{window.location.reload()}),s.querySelector("#fatal-dismiss-btn")?.addEventListener("click",h),document.body.appendChild(s)}}class At{headerEl;annotationBarEl;viewportEl;bugBarEl;dvrBuffer;annotator;runner;activeDvrIndex=0;keypadVisible=!1;logsDrawerVisible=!1;isConnecting=!1;lastFailure=null;runnerMountEl;annotationStageEl;readyStateEl;errorStateEl;gameStageEl;focusPillEl;keypadOverlayEl;logsDrawerEl;constructor(t){this.headerEl=t.headerEl,this.annotationBarEl=t.annotationBarEl,this.viewportEl=t.viewportEl,this.bugBarEl=t.bugBarEl,this.dvrBuffer=new mt(250,40),this.renderHeader(),this.renderAnnotationBar(),this.renderViewport(),this.renderBugReportBar();const e=this.viewportEl.querySelector("#annotation-base-canvas"),n=this.viewportEl.querySelector("#annotation-overlay-canvas");this.annotator=new kt({baseCanvas:e,overlayCanvas:n,width:640,height:360,onHistoryChange:()=>this.updateAnnotationControlsUI()}),this.runner=new It(this.runnerMountEl,this.dvrBuffer,{onFrameRecorded:()=>{if(this.activeDvrIndex=Math.max(0,this.dvrBuffer.length-1),this.updateDvrScrubberUI(),this.runner.isPaused()&&this.annotator.getShapes().length===0){const a=this.dvrBuffer.getLatestFrame();a&&this.annotator.loadBaseFrameDataUrl(a.dataUrl,a.width,a.height)}},onPauseChange:a=>{this.handlePauseStateChanged(a)},onFocusChange:a=>{this.updateFocusPillUI(a)},onLog:(a,s,i)=>{this.updateLogsUI(i)},onPanic:(a,s)=>{this.updateLogsUI(s),this.showPlaytestError(a)}}),this.bindEvents(),this.syncSessionAndWorkspaceFromServer()}async syncSessionAndWorkspaceFromServer(){await ct(),this.updateHeaderInputsUI(),this.updateSessionBadgeUI()}renderHeader(){this.headerEl.innerHTML=`
      <div class="header-left">
        <button
          type="button"
          id="btn-home-ready"
          class="app-brand brand-home-btn"
          data-tooltip="Return to Ready Card / Stop Game"
          title="Return to Ready Card / Stop Game"
          aria-label="Return to Ready Card"
        >
          <span class="brand-logo" aria-hidden="true">🕹️</span>
        </button>

        <div class="workspace-controls">
          <button
            type="button"
            id="btn-build-run"
            class="btn btn-primary btn-sm"
            data-tooltip="Start and connect the Phaser game"
            title="Start and connect the Phaser game"
          >
            <span id="build-btn-label">🚀 Run</span>
          </button>
        </div>
      </div>

      <div class="header-right">
        <button
          type="button"
          id="btn-pause-toggle"
          class="btn btn-outline btn-sm"
          disabled
          data-tooltip="Freeze Frame &amp; Annotate Bug (\` or F8)"
          title="Freeze Frame &amp; Annotate Bug (\` or F8)"
        >
          <span id="pause-btn-label">⏸️ Pause</span>
        </button>

        <button
          type="button"
          id="btn-keypad-toggle"
          class="btn btn-ghost btn-icon"
          data-tooltip="Virtual Gamepad (WASD / Arrows / Space)"
          title="Toggle On-Screen Virtual Gamepad (WASD / Arrows / Space)"
          aria-label="Toggle On-Screen Virtual Gamepad"
        >
          <span>🎮</span>
        </button>

        <button
          type="button"
          id="btn-mute-toggle"
          class="btn btn-ghost btn-icon"
          data-tooltip="Mute / Unmute Game Audio"
          title="Mute / Unmute Game Audio"
          aria-label="Mute or Unmute Game Audio"
        >
          <span id="mute-btn-label">🔊</span>
        </button>

        <button
          type="button"
          id="btn-logs-toggle"
          class="btn btn-ghost btn-icon-badge"
          data-tooltip="Game Console"
          title="Toggle Game Console"
          aria-label="Toggle Game Console"
        >
          <span>📟</span>
          <span id="logs-count-badge" class="badge-pill">0</span>
        </button>

        <button
          type="button"
          id="btn-session-badge"
          class="session-badge disconnected"
          data-tooltip="Active Antigravity Session (Click to switch)"
          title="Active Antigravity Session (Click to switch)"
          aria-label="Switch Antigravity Session"
        >
          <span class="status-dot offline"></span>
          <span>🔗</span>
          <span id="session-badge-text" class="sr-only">Standalone</span>
        </button>

        <a
          id="btn-full-studio"
          href="${this.escapeAttr(G())}"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-ghost btn-icon preview-only-btn"
          data-tooltip="Open Game Dev Studio in Browser Tab"
          title="Open Game Dev Studio in Browser Tab"
          aria-label="Open Game Dev Studio in Browser Tab"
        >
          <span>↗️</span>
        </a>
      </div>
    `,this.updateSessionBadgeUI()}renderAnnotationBar(){const t=nt.map((e,n)=>`
        <button
          type="button"
          class="qa-color-swatch ${n===0?"active":""}"
          data-color="${e.hex}"
          style="background-color: ${e.hex};"
          data-tooltip="Color: ${e.name} (${e.hex})"
          title="Annotation Color: ${e.name} (${e.hex})"
          aria-label="Annotation color ${e.name}"
        ></button>
      `).join("");this.annotationBarEl.innerHTML=`
      <div class="annotation-tools-group" role="toolbar" aria-label="Bug Annotation Tools">
        <button
          type="button"
          class="ann-tool-btn btn-icon"
          data-tool="pen"
          data-tooltip="Freehand Pen (P)"
          title="Freehand Pen (P)"
          aria-label="Freehand Pen Tool (P)"
        >
          <span>✏️</span>
        </button>
        <button
          type="button"
          class="ann-tool-btn btn-icon"
          data-tool="arrow"
          data-tooltip="Pointing Arrow Callout (A)"
          title="Pointing Arrow Callout (A)"
          aria-label="Pointing Arrow Tool (A)"
        >
          <span>🏹</span>
        </button>
        <button
          type="button"
          class="ann-tool-btn btn-icon active"
          data-tool="box"
          data-tooltip="Bounding Box Callout (B)"
          title="Bounding Box Callout (B)"
          aria-label="Bounding Box Tool (B)"
        >
          <span>🔲</span>
        </button>
        <button
          type="button"
          class="ann-tool-btn btn-icon"
          data-tool="text"
          data-tooltip="Text Label Callout (T)"
          title="Text Label Callout (T)"
          aria-label="Text Label Tool (T)"
        >
          <span>🏷️</span>
        </button>

        <div class="bar-divider"></div>

        <div class="qa-swatch-group" role="group" aria-label="QA Colors">
          ${t}
        </div>

        <div class="bar-divider"></div>

        <div class="ann-history-group">
          <button
            type="button"
            id="btn-ann-undo"
            class="btn btn-ghost btn-icon"
            disabled
            data-tooltip="Undo Annotation (⌘Z)"
            title="Undo Annotation (⌘Z)"
            aria-label="Undo Annotation"
          >↩️</button>
          <button
            type="button"
            id="btn-ann-redo"
            class="btn btn-ghost btn-icon"
            disabled
            data-tooltip="Redo Annotation (⇧⌘Z)"
            title="Redo Annotation (⇧⌘Z)"
            aria-label="Redo Annotation"
          >↪️</button>
          <button
            type="button"
            id="btn-ann-clear"
            class="btn btn-ghost btn-icon"
            disabled
            data-tooltip="Clear All Annotations"
            title="Clear All Annotations"
            aria-label="Clear All Annotations"
          >🧹</button>
        </div>
      </div>

      <div class="dvr-scrubber-group" role="region" aria-label="10-Second DVR Frame Scrubber">
        <button
          type="button"
          id="btn-dvr-prev"
          class="btn btn-outline btn-icon"
          data-tooltip="Step Back 1 Frame (←)"
          title="Step Back 1 Frame (←)"
          aria-label="Step Back 1 Frame"
        >⏮️</button>
        <input
          type="range"
          id="dvr-scrubber-slider"
          class="dvr-slider"
          min="0"
          max="0"
          step="1"
          value="0"
          title="Scrub 10-Second Gameplay DVR Buffer (250 frames @ 25fps)"
          aria-label="Scrub recorded gameplay frames"
        />
        <button
          type="button"
          id="btn-dvr-next"
          class="btn btn-outline btn-icon"
          data-tooltip="Step Forward 1 Frame (→)"
          title="Step Forward 1 Frame (→)"
          aria-label="Step Forward 1 Frame"
        >⏭️</button>
        <span
          id="dvr-frame-badge"
          class="dvr-frame-badge"
          data-tooltip="Live (0.0s)"
          title="Live (0.0s)"
        >0.0s</span>
      </div>
    `}renderViewport(){this.viewportEl.innerHTML=`
      <!-- 1. Ready State (before connecting) -->
      <div id="viewport-ready-state" class="viewport-state-panel">
        <div class="ready-card">
          <div class="ready-icon-badge">🎮</div>
          <h2 class="ready-title">Phaser Playtest</h2>
          <p class="ready-subtitle">
            Press <strong>Run</strong> to start the Phaser game in this workspace and connect to it.
            Press <kbd>F8</kbd> during play to pause and annotate a frame.
          </p>

          <div class="ready-form-row">
            <div class="ready-field">
              <label for="playtest-folder">Game folder</label>
              <input
                type="text"
                id="playtest-folder"
                class="input-text"
                placeholder="Workspace folder (or a folder whose package.json depends on phaser)"
                spellcheck="false"
              />
            </div>
          </div>

          <details id="playtest-url-details" class="ready-advanced">
            <summary>Connect to a server you started yourself</summary>
            <div class="ready-field">
              <label for="playtest-url">Playtest URL from <code>scripts/playtest-phaser.mjs</code></label>
              <input
                type="url"
                id="playtest-url"
                class="input-text"
                placeholder="http://127.0.0.1:5173"
              />
            </div>
          </details>

          <div class="ready-actions">
            <button type="button" id="btn-ready-build" class="btn btn-primary btn-lg">
              <span>▶ Run game</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Connection or runtime error -->
      <div id="viewport-error-state" class="viewport-state-panel hidden">
        <div class="error-card">
          <div class="error-card-header">
            <div class="error-title-wrap">
              <span class="error-badge-icon">🚨</span>
              <div>
                <h3 id="error-state-title" class="error-card-title">Playtest connection failed</h3>
                <div id="error-state-meta" class="error-card-meta"></div>
              </div>
            </div>
            <div class="error-card-actions">
              <button type="button" id="btn-retry-build" class="btn btn-outline btn-sm">🔄 Try again</button>
              <button type="button" id="btn-send-build-error" class="btn btn-danger btn-sm">
                <span>🚨 Send Game Error to Chat</span>
              </button>
            </div>
          </div>
          <pre id="error-state-traceback" class="error-traceback-pre"></pre>
        </div>
      </div>

      <!-- 3. Active Game + Frozen DVR Annotation Stage -->
      <div id="viewport-game-stage" class="viewport-game-stage hidden">
        <div id="game-runner-mount" class="game-runner-mount"></div>

        <div id="annotation-stage" class="annotation-stage hidden">
          <div class="annotation-canvas-wrapper">
            <canvas id="annotation-base-canvas" class="annotation-base-canvas"></canvas>
            <canvas id="annotation-overlay-canvas" class="annotation-overlay-canvas"></canvas>
          </div>
        </div>

        <!-- Focus & Controls Status Pill -->
        <button type="button" id="focus-status-pill" class="focus-status-pill unfocused">
          <span>🎮 Click Game Viewport to Capture Keyboard &amp; Audio</span>
        </button>

        <!-- Collapsible On-Screen Virtual Gamepad Overlay -->
        <div id="virtual-keypad-overlay" class="virtual-keypad-overlay hidden" aria-label="On-Screen Virtual Gamepad">
          <div class="keypad-dpad">
            <button type="button" class="keypad-btn dpad-up" data-code="ArrowUp" data-key="ArrowUp">▲</button>
            <div class="dpad-mid-row">
              <button type="button" class="keypad-btn dpad-left" data-code="ArrowLeft" data-key="ArrowLeft">◀</button>
              <button type="button" class="keypad-btn dpad-down" data-code="ArrowDown" data-key="ArrowDown">▼</button>
              <button type="button" class="keypad-btn dpad-right" data-code="ArrowRight" data-key="ArrowRight">▶</button>
            </div>
          </div>
          <div class="keypad-actions">
            <button type="button" class="keypad-btn action-btn" data-code="KeyZ" data-key="z">Z</button>
            <button type="button" class="keypad-btn action-btn" data-code="KeyX" data-key="x">X</button>
            <button type="button" class="keypad-btn action-btn action-space" data-code="Space" data-key=" ">SPACE</button>
          </div>
        </div>

        <!-- Collapsible Game Console Drawer -->
        <div id="logs-drawer" class="logs-drawer hidden">
          <div class="logs-drawer-header">
            <span>Game Console &amp; Runtime Logs (Last 200 lines)</span>
            <div class="logs-drawer-actions">
              <button type="button" id="btn-clear-logs" class="btn btn-ghost btn-sm">Clear</button>
              <button type="button" id="btn-close-logs" class="btn btn-ghost btn-sm">✕</button>
            </div>
          </div>
          <pre id="logs-drawer-content" class="logs-drawer-pre">No Game console output recorded yet.</pre>
        </div>
      </div>
    `,this.readyStateEl=this.viewportEl.querySelector("#viewport-ready-state"),this.errorStateEl=this.viewportEl.querySelector("#viewport-error-state"),this.gameStageEl=this.viewportEl.querySelector("#viewport-game-stage"),this.runnerMountEl=this.viewportEl.querySelector("#game-runner-mount"),this.annotationStageEl=this.viewportEl.querySelector("#annotation-stage"),this.focusPillEl=this.viewportEl.querySelector("#focus-status-pill"),this.keypadOverlayEl=this.viewportEl.querySelector("#virtual-keypad-overlay"),this.logsDrawerEl=this.viewportEl.querySelector("#logs-drawer")}renderBugReportBar(){this.bugBarEl.innerHTML=`
      <input
        type="text"
        id="bug-note-input"
        class="input-text bug-note-input"
        placeholder="Describe the visual bug or instruction for Antigravity..."
        aria-label="Bug description or instruction for Antigravity"
      />
      <input type="checkbox" id="include-logs-checkbox" checked class="hidden" aria-hidden="true" />
      <button
        type="button"
        id="btn-toggle-attach-logs"
        class="btn btn-ghost btn-icon btn-toggle active"
        data-tooltip-pos="top"
        data-tooltip="Attach Game Console Logs (ON)"
        title="Attach Captured Game Console Logs (ON: Click to toggle)"
        aria-label="Toggle attaching Game console logs"
        aria-pressed="true"
      >
        <span>📋</span>
      </button>
      <button
        type="button"
        id="btn-send-bug-chat"
        class="btn btn-send-chat btn-sm"
        data-tooltip-pos="top"
        data-tooltip="Send Annotated Frame (.png) to Chat (Enter)"
        title="Send Annotated Frame Screenshot (.png) to Chat (Enter)"
      >
        <span>📸 Frame</span>
      </button>
      <button
        type="button"
        id="btn-send-gif-chat"
        class="btn btn-send-gif btn-sm"
        data-tooltip-pos="top"
        data-tooltip="Send 10-Second DVR Replay (.gif @ 25fps) to Chat"
        title="Send 10-Second DVR Replay as Animated GIF (.gif @ 25fps) to Chat"
      >
        <span>🎞️ 10s GIF</span>
      </button>
    `}bindEvents(){const t=this.viewportEl.querySelector("#playtest-folder");t?.addEventListener("input",()=>{delete t.dataset.autofilled});for(const l of["#playtest-url","#playtest-folder"])this.viewportEl.querySelector(l)?.addEventListener("keydown",c=>{c.key==="Enter"&&this.connectGame()});rt(()=>this.updateHeaderInputsUI()),it(()=>this.updateSessionBadgeUI()),this.headerEl.querySelector("#btn-build-run")?.addEventListener("click",()=>{this.connectGame()}),this.viewportEl.querySelector("#btn-ready-build")?.addEventListener("click",()=>{this.connectGame()}),this.viewportEl.querySelector("#btn-retry-build")?.addEventListener("click",()=>{this.connectGame()}),this.viewportEl.querySelector("#btn-send-build-error")?.addEventListener("click",()=>{this.handleSendBuildErrorToChat()}),this.headerEl.querySelector("#btn-pause-toggle")?.addEventListener("click",()=>{this.runner.togglePause()}),this.headerEl.querySelector("#btn-home-ready")?.addEventListener("click",()=>{this.showReadyStateView(),gt().catch(()=>{})}),this.headerEl.querySelector("#btn-keypad-toggle")?.addEventListener("click",()=>{this.keypadVisible=!this.keypadVisible,this.keypadOverlayEl.classList.toggle("hidden",!this.keypadVisible),this.headerEl.querySelector("#btn-keypad-toggle")?.classList.toggle("active",this.keypadVisible)}),this.headerEl.querySelector("#btn-mute-toggle")?.addEventListener("click",()=>{const l=this.runner.toggleMuted(),c=this.headerEl.querySelector("#mute-btn-label"),h=this.headerEl.querySelector("#btn-mute-toggle");if(c&&(c.textContent=l?"🔇":"🔊"),h){const u=l?"Unmute Game Audio (Muted)":"Mute Game Audio";h.setAttribute("data-tooltip",u),h.setAttribute("title",u)}}),this.headerEl.querySelector("#btn-logs-toggle")?.addEventListener("click",()=>{this.logsDrawerVisible=!this.logsDrawerVisible,this.logsDrawerEl.classList.toggle("hidden",!this.logsDrawerVisible),this.headerEl.querySelector("#btn-logs-toggle")?.classList.toggle("active",this.logsDrawerVisible)}),this.viewportEl.querySelector("#btn-close-logs")?.addEventListener("click",()=>{this.logsDrawerVisible=!1,this.logsDrawerEl.classList.add("hidden"),this.headerEl.querySelector("#btn-logs-toggle")?.classList.remove("active")}),this.viewportEl.querySelector("#btn-clear-logs")?.addEventListener("click",()=>{this.runner.clearConsoleLogs(),this.updateLogsUI([])}),this.headerEl.querySelector("#btn-session-badge")?.addEventListener("click",()=>{this.openSessionSwitcherModal()}),this.focusPillEl.addEventListener("click",()=>{this.runner.isPaused()||this.runner.focus()}),this.keypadOverlayEl.querySelectorAll(".keypad-btn").forEach(l=>{const c=l,h=c.dataset.code||"Space",u=c.dataset.key||" ",f=m=>{m.preventDefault(),c.classList.add("pressed"),this.runner.dispatchVirtualKey(h,u,"keydown")},g=m=>{m.preventDefault(),c.classList.contains("pressed")&&(c.classList.remove("pressed"),this.runner.dispatchVirtualKey(h,u,"keyup"))};c.addEventListener("pointerdown",f),c.addEventListener("pointerup",g),c.addEventListener("pointerleave",g),c.addEventListener("pointercancel",g)}),this.annotationBarEl.querySelectorAll(".ann-tool-btn").forEach(l=>{l.addEventListener("click",()=>{const c=l.dataset.tool;c&&this.selectAnnotationTool(c)})});const a=this.annotationBarEl.querySelectorAll(".qa-color-swatch");a.forEach(l=>{l.addEventListener("click",()=>{const c=l.dataset.color;c&&(this.annotator.setColor(c),a.forEach(h=>h.classList.remove("active")),l.classList.add("active"))})}),this.annotationBarEl.querySelector("#btn-ann-undo")?.addEventListener("click",()=>{this.annotator.undo()}),this.annotationBarEl.querySelector("#btn-ann-redo")?.addEventListener("click",()=>{this.annotator.redo()}),this.annotationBarEl.querySelector("#btn-ann-clear")?.addEventListener("click",()=>{this.annotator.clearAnnotations()});const s=this.annotationBarEl.querySelector("#dvr-scrubber-slider");s.addEventListener("input",()=>{const l=Number.parseInt(s.value,10);this.scrubToDvrFrame(l)}),this.annotationBarEl.querySelector("#btn-dvr-prev")?.addEventListener("click",()=>{if(this.dvrBuffer.length>0){const l=Math.max(0,this.activeDvrIndex-1);this.scrubToDvrFrame(l)}}),this.annotationBarEl.querySelector("#btn-dvr-next")?.addEventListener("click",()=>{if(this.dvrBuffer.length>0){const l=Math.min(this.dvrBuffer.length-1,this.activeDvrIndex+1);this.scrubToDvrFrame(l)}});const i=this.bugBarEl.querySelector("#btn-toggle-attach-logs"),o=this.bugBarEl.querySelector("#include-logs-checkbox");i?.addEventListener("click",()=>{const l=o?!o.checked:!1;o&&(o.checked=l),i.classList.toggle("active",l),i.setAttribute("aria-pressed",String(l));const c=l?"Attach Game Console Logs (ON)":"Attach Game Console Logs (OFF)";i.setAttribute("data-tooltip",c),i.setAttribute("title",c)}),this.bugBarEl.querySelector("#bug-note-input").addEventListener("keydown",l=>{l.key==="Enter"&&(l.preventDefault(),this.handleSendBugToChat())}),this.bugBarEl.querySelector("#btn-send-bug-chat")?.addEventListener("click",()=>{this.handleSendBugToChat()}),this.bugBarEl.querySelector("#btn-send-gif-chat")?.addEventListener("click",()=>{this.handleSendGifToChat()}),window.addEventListener("keydown",l=>{if(this.headerEl.classList.contains("studio-view-hidden"))return;const c=l.target,h=c&&(c.tagName==="INPUT"||c.tagName==="TEXTAREA"||c.isContentEditable);if(l.code==="F8"||!h&&l.code==="Backquote"){this.runner.isRunning()&&(l.preventDefault(),l.stopPropagation(),this.runner.togglePause());return}if(!(h||!this.runner.isPaused())){if((l.metaKey||l.ctrlKey)&&l.key.toLowerCase()==="z"){l.preventDefault(),l.shiftKey?this.annotator.redo():this.annotator.undo();return}l.code==="KeyP"?(l.preventDefault(),this.selectAnnotationTool("pen")):l.code==="KeyA"?(l.preventDefault(),this.selectAnnotationTool("arrow")):l.code==="KeyB"?(l.preventDefault(),this.selectAnnotationTool("box")):l.code==="KeyT"?(l.preventDefault(),this.selectAnnotationTool("text")):l.code==="ArrowLeft"?(l.preventDefault(),this.scrubToDvrFrame(Math.max(0,this.activeDvrIndex-1))):l.code==="ArrowRight"&&(l.preventDefault(),this.scrubToDvrFrame(Math.min(this.dvrBuffer.length-1,this.activeDvrIndex+1)))}},{capture:!0})}async connectGame(){if(!this.isConnecting){this.isConnecting=!0,this.showReadyStateView(),this.annotator.resetHistory(),this.setConnectButtonsLoading(!0);try{const t=this.viewportEl.querySelector("#playtest-url")?.value.trim()||"",e=!!t&&!!this.viewportEl.querySelector("#playtest-url-details")?.open;let n=t;if(!e){this.setConnectButtonsLoading(!0,"Starting game...");const s=this.viewportEl.querySelector("#playtest-folder")?.value.trim()||"";n=(await pt(s||k())).url,this.setConnectButtonsLoading(!0)}this.showActiveGameStage(),await this.runner.connect(n);const a=this.headerEl.querySelector("#btn-pause-toggle");a&&(a.disabled=!1),this.runner.focus()}catch(t){t instanceof tt?this.showPlaytestError(t.message,t.detail):this.readyStateEl.classList.contains("hidden")&&this.showPlaytestError(t?.message||String(t))}finally{this.isConnecting=!1,this.setConnectButtonsLoading(!1)}}}handlePauseStateChanged(t){const e=this.headerEl.querySelector("#btn-pause-toggle"),n=this.headerEl.querySelector("#pause-btn-label");if(t){e&&(e.classList.add("btn-warning-active"),e.setAttribute("data-tooltip","Resume Gameplay (` or F8)"),e.setAttribute("title","Resume Gameplay (` or F8)")),n&&(n.textContent="▶️ Resume"),this.annotationBarEl.classList.remove("hidden"),this.annotationStageEl.classList.remove("hidden");const a=this.dvrBuffer.getLatestFrame();a&&this.annotator.loadBaseFrameDataUrl(a.dataUrl,a.width,a.height),this.activeDvrIndex=Math.max(0,this.dvrBuffer.length-1),this.updateDvrScrubberUI(),this.updateFocusPillUI(!1)}else e&&(e.classList.remove("btn-warning-active"),e.setAttribute("data-tooltip","Freeze Frame & Annotate Bug (` or F8)"),e.setAttribute("title","Freeze Frame & Annotate Bug (` or F8)")),n&&(n.textContent="⏸️ Pause"),this.annotationBarEl.classList.add("hidden"),this.annotationStageEl.classList.add("hidden"),this.runner.focus()}async scrubToDvrFrame(t){const e=this.dvrBuffer.getFrameAt(t);e&&(this.activeDvrIndex=e.index,this.updateDvrScrubberUI(),e.canvas?this.annotator.loadBaseFromCanvas(e.canvas):await this.annotator.loadBaseFrameDataUrl(e.dataUrl,e.width,e.height))}updateDvrScrubberUI(){const t=this.annotationBarEl.querySelector("#dvr-scrubber-slider"),e=this.annotationBarEl.querySelector("#dvr-frame-badge"),n=this.annotationBarEl.querySelector("#btn-dvr-prev"),a=this.annotationBarEl.querySelector("#btn-dvr-next"),s=this.dvrBuffer.length;if(s===0){t&&(t.min="0",t.max="0",t.value="0",t.disabled=!0),e&&(e.textContent="0.0s",e.setAttribute("data-tooltip","Live (0.0s)"),e.setAttribute("title","Live (0.0s)")),n&&(n.disabled=!0),a&&(a.disabled=!0);return}const i=Math.max(0,Math.min(s-1,this.activeDvrIndex)),o=this.dvrBuffer.getFrameAt(i);if(t&&(t.disabled=!1,t.min="0",t.max=String(s-1),t.value=String(i)),n&&(n.disabled=i<=0),a&&(a.disabled=i>=s-1),e&&o){const d=o.relativeSec===0?"0.0s":`${o.relativeSec.toFixed(1)}s`,l=o.relativeSec===0?`Live (0.0s) · Frame ${i+1}/${s}`:`${o.relativeSec.toFixed(2)}s · Frame ${i+1}/${s}`;e.textContent=d,e.setAttribute("data-tooltip",l),e.setAttribute("title",l)}}selectAnnotationTool(t){this.annotator.setTool(t),this.annotationBarEl.querySelectorAll(".ann-tool-btn").forEach(n=>{const a=n.dataset.tool;n.classList.toggle("active",a===t)})}updateAnnotationControlsUI(){const t=this.annotationBarEl.querySelector("#btn-ann-undo"),e=this.annotationBarEl.querySelector("#btn-ann-redo"),n=this.annotationBarEl.querySelector("#btn-ann-clear");t&&(t.disabled=!this.annotator.canUndo()),e&&(e.disabled=!this.annotator.canRedo()),n&&(n.disabled=this.annotator.getShapes().length===0)}updateFocusPillUI(t){if(this.focusPillEl){if(this.runner.isPaused()){this.focusPillEl.className="focus-status-pill paused",this.focusPillEl.innerHTML="<span>⏸ Paused: Draw on Frame or Scrub 10s DVR</span>";return}t?(this.focusPillEl.className="focus-status-pill focused",this.focusPillEl.innerHTML="<span>● Controls Active (` or F8 to Pause)</span>"):(this.focusPillEl.className="focus-status-pill unfocused",this.focusPillEl.innerHTML="<span>🎮 Click Game Viewport to Capture Keyboard &amp; Audio</span>")}}updateLogsUI(t){const e=this.headerEl.querySelector("#logs-count-badge");e&&(e.textContent=String(t.length));const n=this.viewportEl.querySelector("#logs-drawer-content");n&&(n.textContent=t.length>0?t.join(`
`):"No Game console output recorded yet.",n.scrollTop=n.scrollHeight)}showReadyStateView(){this.runner.destroy(),this.lastFailure=null,this.annotationBarEl.classList.add("hidden"),this.annotationStageEl.classList.add("hidden"),this.gameStageEl.classList.add("hidden"),this.errorStateEl.classList.add("hidden"),this.readyStateEl.classList.remove("hidden");const t=this.headerEl.querySelector("#btn-pause-toggle"),e=this.headerEl.querySelector("#pause-btn-label");t&&(t.disabled=!0,t.classList.remove("btn-warning-active")),e&&(e.textContent="⏸️ Pause"),this.updateHeaderInputsUI()}showActiveGameStage(){this.readyStateEl.classList.add("hidden"),this.errorStateEl.classList.add("hidden"),this.gameStageEl.classList.remove("hidden")}showErrorView(t){this.runner.destroy(),this.annotationBarEl.classList.add("hidden"),this.readyStateEl.classList.add("hidden"),this.gameStageEl.classList.add("hidden"),this.errorStateEl.classList.remove("hidden");const e=this.viewportEl.querySelector("#error-state-title"),n=this.viewportEl.querySelector("#error-state-meta"),a=this.viewportEl.querySelector("#error-state-traceback");e&&(e.textContent=t.error||"Playtest connection failed"),n&&(n.textContent=`Workspace: ${t.workspace}`),a&&(a.textContent=t.detail)}showPlaytestError(t,e){const n=k()||".",a=e!==void 0,s=a?e?["Game server output:",e]:[]:this.runner.getConsoleLogs().slice(-30);this.lastFailure={error:a?"Could not start the Phaser game":"Phaser playtest error",detail:[t,"",...s].join(`
`),workspace:n},this.showErrorView(this.lastFailure)}async handleSendBuildErrorToChat(){if(!this.lastFailure)return;const t=this.viewportEl.querySelector("#btn-send-build-error");t&&(t.disabled=!0);try{const n=this.bugBarEl.querySelector("#bug-note-input")?.value.trim()||"";await ut({buildError:this.lastFailure.detail,note:n,workspace:this.lastFailure.workspace}),C.success("Sent game error directly to Antigravity chat!")}catch(e){C.error("Failed to send playtest error to chat",e?.message||String(e))}finally{t&&(t.disabled=!1)}}async ensurePausedFrameLoaded(){this.runner.isRunning()&&!this.runner.isPaused()&&this.runner.setPaused(!0);const t=this.dvrBuffer.getFrameAt(this.activeDvrIndex);if(!this.runner.isRunning()||!t)throw new Error("Connect to a game and capture a frame first.");await this.annotator.loadBaseFrameDataUrl(t.dataUrl,t.width,t.height)}decodeDataUrlToImage(t){return new Promise((e,n)=>{const a=new Image;a.onload=()=>e(a),a.onerror=()=>n(new Error("Failed to decode frame dataUrl into HTMLImageElement.")),a.src=t})}async buildDvrAnimatedGifDataUrl(){await this.ensurePausedFrameLoaded();const t=this.dvrBuffer.getFrames(),e=t.length>0?Math.max(0,Math.min(t.length-1,this.activeDvrIndex)):0,n=t[e]?.timestampMs??0,a=t.slice(0,e+1).filter(p=>n-p.timestampMs<1e4),s=this.annotator.getDimensions(),i=a[0]?.width||s.width||640,o=a[0]?.height||s.height||360;let d={x:0,y:0,width:i,height:o};const l=a[a.length-1]||a[0];if(l){const p=document.createElement("canvas");p.width=i,p.height=o;const b=p.getContext("2d",{willReadFrequently:!0});if(b){if(b.clearRect(0,0,i,o),l.canvas)b.drawImage(l.canvas,0,0,i,o);else if(l.dataUrl){const L=await this.decodeDataUrlToImage(l.dataUrl);b.drawImage(L,0,0,i,o)}const E=b.getImageData(0,0,i,o);d=et(E.data,i,o)}}const c=480,h=d.width>c?c/d.width:1,u=Math.max(64,Math.round(d.width*h)),f=Math.max(36,Math.round(d.height*h)),g=document.createElement("canvas");g.width=u,g.height=f;const m=g.getContext("2d",{willReadFrequently:!0});if(!m)throw new Error("Failed to acquire 2D context for GIF encoding.");m.imageSmoothingEnabled=!1;const y=[];for(let p=0;p<a.length;p++){const b=a[p];if(m.fillStyle="#090D16",m.fillRect(0,0,u,f),b.canvas)m.drawImage(b.canvas,d.x,d.y,d.width,d.height,0,0,u,f);else{const A=await this.decodeDataUrlToImage(b.dataUrl);m.drawImage(A,d.x,d.y,d.width,d.height,0,0,u,f)}const E=m.getImageData(0,0,u,f),L=p===a.length-1;let W=this.dvrBuffer.captureIntervalMs;if(p+1<a.length){const A=a[p+1].timestampMs-b.timestampMs;Number.isFinite(A)&&A>=15&&A<=250&&(W=Math.round(A))}y.push({rgba:new Uint8Array(E.data),delayMs:L?900:W})}if(!y.length)throw new Error("No Phaser frames have been captured yet.");const v=St({width:u,height:f,frames:y}),w=a.length>=2?(a[a.length-1].timestampMs-a[0].timestampMs)/1e3:a.length*this.dvrBuffer.captureIntervalMs/1e3,S=Number(Math.max(.04,w).toFixed(2));return{dataUrl:Et(v),width:u,height:f,frameCount:y.length,durationSec:S}}async handleSendGifToChat(){if(this.lastFailure&&!this.runner.isRunning()){await this.handleSendBuildErrorToChat();return}const t=this.bugBarEl.querySelector("#btn-send-gif-chat"),e=this.bugBarEl.querySelector("#btn-send-bug-chat");t&&(t.disabled=!0),e&&(e.disabled=!0);try{C.info("Encoding 10s DVR replay (25 FPS) into animated GIF...",2400);const n=await this.buildDvrAnimatedGifDataUrl(),a=this.bugBarEl.querySelector("#bug-note-input"),s=this.bugBarEl.querySelector("#include-logs-checkbox"),i=a?.value.trim()||"",d=(s?s.checked:!0)?this.runner.getConsoleLogs():[],l=this.dvrBuffer.getFrameAt(this.activeDvrIndex),c=l?l.relativeSec===0?"live (0.0s)":`${l.relativeSec.toFixed(2)}s`:"live",h=`playtest-clip-${Date.now()}.gif`,u=await V({filename:h,imageDataUrl:n.dataUrl,note:i,consoleLogs:d,workspace:k()||".",frameOffset:`${n.frameCount}f (${n.durationSec}s DVR → ${c})`,resolution:`${n.width}x${n.height}`,width:n.width,height:n.height});C.success(`Delivered 10s DVR GIF "${u.filename||h}" (${n.frameCount} frames) to chat!`),a&&(a.value="")}catch(n){C.error("Failed to encode or send 10s DVR GIF",n?.message||String(n))}finally{t&&(t.disabled=!1),e&&(e.disabled=!1)}}async handleSendBugToChat(){if(this.lastFailure&&!this.runner.isRunning()){await this.handleSendBuildErrorToChat();return}const t=this.bugBarEl.querySelector("#btn-send-bug-chat"),e=this.bugBarEl.querySelector("#btn-send-gif-chat");t&&(t.disabled=!0),e&&(e.disabled=!0);try{await this.ensurePausedFrameLoaded();const n=this.bugBarEl.querySelector("#bug-note-input"),a=this.bugBarEl.querySelector("#include-logs-checkbox"),s=n?.value.trim()||"",o=(a?a.checked:!0)?this.runner.getConsoleLogs():[],d=this.annotator.exportSmartComposite(),l=this.dvrBuffer.getFrameAt(this.activeDvrIndex),c=l?l.relativeSec===0?"live (0.0s)":`${l.relativeSec.toFixed(2)}s`:"live",h=`playtest-bug-${Date.now()}.png`,u=await V({filename:h,imageDataUrl:d.dataUrl,note:s,consoleLogs:o,workspace:k()||".",frameOffset:c,resolution:`${d.width}x${d.height}`,width:d.width,height:d.height});C.success(`Delivered "${u.filename||h}" to Antigravity chat!`),n&&(n.value="")}catch(n){C.error("Failed to send bug report to chat",n?.message||String(n))}finally{t&&(t.disabled=!1),e&&(e.disabled=!1)}}setConnectButtonsLoading(t,e="Connecting..."){const n=this.headerEl.querySelector("#btn-build-run"),a=this.headerEl.querySelector("#build-btn-label"),s=this.viewportEl.querySelector("#btn-ready-build");n&&(n.disabled=t),s&&(s.disabled=t,s.innerHTML=t?`<span>⏳ ${e}</span>`:"<span>▶ Run game</span>"),a&&(a.textContent=t?`⏳ ${e}`:"🚀 Run")}updateHeaderInputsUI(){const t=this.viewportEl.querySelector("#playtest-folder"),e=k();t&&e&&(!t.value||t.dataset.autofilled==="1")&&(t.value=e,t.dataset.autofilled="1");const n=this.headerEl.querySelector("#btn-full-studio");n&&(n.href=G())}updateSessionBadgeUI(){const t=$(),e=this.headerEl.querySelector("#btn-session-badge"),n=this.headerEl.querySelector("#btn-full-studio");if(e){const a=e.querySelector(".status-dot"),s=e.querySelector("#session-badge-text");if(t&&t!=="standalone"){e.className="session-badge connected",a&&(a.className="status-dot online"),s&&(s.textContent=`${t.slice(0,8)}...`);const i=`Session: ${t.slice(0,8)}... (Click to switch)`;e.setAttribute("data-tooltip",i),e.setAttribute("title",i)}else{e.className="session-badge disconnected",a&&(a.className="status-dot offline"),s&&(s.textContent="Standalone");const i="Session: Standalone (Click to connect)";e.setAttribute("data-tooltip",i),e.setAttribute("title",i)}}n&&(n.href=G())}async openSessionSwitcherModal(){const t=document.getElementById("session-switcher-modal");t&&t.remove();const e=document.createElement("div");e.id="session-switcher-modal",e.className="modal-overlay",e.innerHTML=`
      <div class="modal-dialog session-modal-dialog">
        <div class="modal-header">
          <span class="modal-title">Connect Antigravity Session</span>
          <button type="button" class="modal-close-btn" id="session-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="session-manual-row">
            <input
              type="text"
              id="manual-session-input"
              class="input-text"
              placeholder="Paste Session UUID or 'standalone'"
              value="${this.escapeAttr($()||"")}"
            />
            <button type="button" id="btn-apply-session" class="btn btn-primary btn-sm">Connect</button>
          </div>
          <div id="recent-sessions-list" class="recent-sessions-list">
            <div class="session-loading">Loading recent Antigravity sessions...</div>
          </div>
        </div>
      </div>
    `;const n=()=>e.remove();e.querySelector("#session-modal-close")?.addEventListener("click",n),e.addEventListener("click",s=>{s.target===e&&n()}),e.querySelector("#btn-apply-session")?.addEventListener("click",()=>{const i=e.querySelector("#manual-session-input").value.trim();if(i)try{O(i),C.success(`Connected to session ${i}`),n()}catch(o){C.error("Invalid Session ID",o?.message||String(o))}}),document.body.appendChild(e);const a=e.querySelector("#recent-sessions-list");try{const s=await ht();if(s.length===0){a.innerHTML='<div class="session-empty">No recent sessions found.</div>';return}a.innerHTML=s.map(i=>`
          <button type="button" class="session-item-btn" data-sid="${this.escapeAttr(i.id)}">
            <span class="session-item-id">${this.escapeHtml(i.id)}</span>
            <span class="session-item-time">${this.escapeHtml(new Date(i.updatedAt).toLocaleTimeString())}</span>
          </button>
        `).join(""),a.querySelectorAll(".session-item-btn").forEach(i=>{i.addEventListener("click",()=>{const o=i.dataset.sid;o&&(O(o),C.success(`Connected to session ${o.slice(0,8)}...`),n())})})}catch(s){a.innerHTML=`<div class="session-empty">Failed to load sessions: ${this.escapeHtml(s?.message||String(s))}</div>`}}escapeHtml(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}escapeAttr(t){return this.escapeHtml(t).replace(/'/g,"&#39;")}}function Bt(r){const t=r.trim().toLowerCase();if(!t)return null;const e=t.match(/^#([0-9a-f]{3,8})$/i);if(e){const o=e[1];let d=0,l=0,c=0;return o.length===3||o.length===4?(d=parseInt(o[0]+o[0],16),l=parseInt(o[1]+o[1],16),c=parseInt(o[2]+o[2],16)):o.length>=6&&(d=parseInt(o.slice(0,2),16),l=parseInt(o.slice(2,4),16),c=parseInt(o.slice(4,6),16)),(.299*d+.587*l+.114*c)/255}const n=t.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/);if(n){const o=Number(n[1]),d=Number(n[2]),l=Number(n[3]);return(.299*o+.587*d+.114*l)/255}const a=t.match(/^hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%\s*[, ]\s*([\d.]+)%/);if(a)return Number(a[1])/100;const s=t.match(/^oklch\(\s*([\d.]+)(%?)/);if(s){const o=Number(s[1]);return s[2]==="%"?o/100:o}const i=t.match(/^[\d.]+\s+[\d.]+%\s+([\d.]+)%$/);return i?Number(i[1])/100:null}function B(r){const t=document.documentElement,e=r==="light",n=t.classList.contains("light")!==e||t.classList.contains("dark")!==!e;t.classList.toggle("light",e),t.classList.toggle("dark",!e),document.body?.classList.toggle("light",e),document.body?.classList.toggle("dark",!e),n&&window.dispatchEvent(new CustomEvent("studio-theme-change",{detail:{theme:r}}))}function F(r){if(r==="light"||r==="dark"){B(r);return}const e=(new URLSearchParams(window.location.search).get("theme")||"").trim().toLowerCase();if(e==="light"||e==="dark"){B(e);return}const n=document.documentElement,a=(n.getAttribute("data-theme")||document.body?.getAttribute("data-theme")||"").trim().toLowerCase();if(a.includes("light")){B("light");return}if(a.includes("dark")){B("dark");return}const s=getComputedStyle(n),i=s.getPropertyValue("--background").trim()||s.getPropertyValue("--vscode-editor-background").trim()||(document.body?getComputedStyle(document.body).getPropertyValue("--background").trim():""),o=Bt(i);if(o!==null){B(o>.55?"light":"dark");return}if(typeof window.matchMedia=="function"&&window.matchMedia("(prefers-color-scheme: light)").matches){B("light");return}}function Ft(){if(F(),window.addEventListener("message",r=>{const t=r.data;if(!t||typeof t!="object")return;const e=String(t.type||t.event||"").toLowerCase();if(e==="theme-change"||e==="theme"||e==="antigravity:theme-change"||typeof t.theme=="string"||typeof t.colorScheme=="string"){const n=String(t.theme||t.colorScheme||t.mode||"").toLowerCase();n.includes("light")?F("light"):n.includes("dark")?F("dark"):F()}}),typeof MutationObserver<"u"&&new MutationObserver(()=>{F()}).observe(document.documentElement,{attributes:!0,attributeFilter:["style","data-theme"]}),typeof window.matchMedia=="function"){const r=window.matchMedia("(prefers-color-scheme: light)");typeof r.addEventListener=="function"&&r.addEventListener("change",()=>F())}}function j(){try{Ft(),document.title="Game Dev Studio";const r=lt(),t=r==="preview"?"studio-mode-preview":"studio-mode-full";document.body.classList.remove("studio-mode-preview","studio-mode-full"),document.body.classList.add("studio-container",t),r==="preview"?document.body.classList.add("bg-transparent"):document.body.classList.remove("bg-transparent");const e=document.getElementById("app");e&&(e.classList.remove("studio-mode-preview","studio-mode-full"),e.classList.add("studio-container",t));const n=document.getElementById("app-root");n&&(n.classList.remove("studio-mode-preview","studio-mode-full"),n.classList.add("studio-container",t));const a=document.getElementById("header-bar"),s=document.getElementById("annotation-bar"),i=document.getElementById("viewport-container"),o=document.getElementById("bug-report-bar");if(!n||!a||!s||!i||!o)throw new Error("Required DOM containers not found for Game Dev Studio. Missing: "+[!n&&"#app-root",!a&&"#header-bar",!s&&"#annotation-bar",!i&&"#viewport-container",!o&&"#bug-report-bar"].filter(Boolean).join(", "));new At({headerEl:a,annotationBarEl:s,viewportEl:i,bugBarEl:o}),console.log(`[Game Dev Studio] Initialized playtest view in "${r}" mode`)}catch(r){console.error("[Game Dev Studio] Initialization error:",r),C.fatal("Game Dev Studio Initialization Failed",r)}}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",j,{once:!0}):j();window.addEventListener("error",r=>{console.error("[Game Dev Studio] Uncaught Window Error:",r),C.fatal("Uncaught Runtime Error",r.error||r.message)});window.addEventListener("unhandledrejection",r=>{console.error("[Game Dev Studio] Unhandled Promise Rejection:",r),C.fatal("Unhandled Promise Rejection",r.reason)});
