(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(pointer: coarse), (max-width: 760px)');
  const supported = new Set(['sony-a7m5','yashica-electro-35-gs','polaroid-sx70','polaroid-690','fujifilm-sq1','polaroid-go-gen3-blue']);
  const ns = 'http://www.w3.org/2000/svg';
  let busy = false;
  const ease = t => t < .5 ? 16*t**5 : 1-(-2*t+2)**5/2;
  const clamp = t => Math.max(0,Math.min(1,t));
  const tween = (ms, draw) => new Promise(resolve => { let start; function frame(now) { start ??= now; const p=clamp((now-start)/ms); draw(ease(p),p); if(p<1) requestAnimationFrame(frame); else resolve(); } requestAnimationFrame(frame); });
  const group = (svg, nodes) => { const g=document.createElementNS(ns,'g'); nodes[0].before(g); nodes.forEach(n=>g.append(n)); return g; };
  const arrival = () => { requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('device-arriving'))); };
  arrival();
  addEventListener('pageshow',()=>{document.querySelector('.device-transition')?.remove(); document.documentElement.classList.remove('device-arriving'); document.body.style.overflow=''; document.querySelectorAll('.camera-art img').forEach(img=>img.style.visibility=''); busy=false;});
  document.addEventListener('click',async event=>{
    const link=event.target.closest('.camera-card');
    if(!link || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    const id=new URL(link.href).pathname.split('/').filter(Boolean).at(-1);
    if(!supported.has(id))return;
    event.preventDefault(); if(busy)return; busy=true;
    let overlay, originalImage;
    const restoreImage=()=>{if(originalImage)originalImage.style.visibility='';};
    let leaving=false;
    const go=()=>{if(leaving)return;leaving=true;try{sessionStorage.setItem('device-arrival',new URL(link.href).pathname);}catch{} location.assign(link.href);};
    const fallback=()=>{
      const image=link.querySelector('.camera-art img');
      const cover=document.createElement('div');
      cover.className='device-transition device-transition-fallback';
      cover.innerHTML='<div class="device-transition-backdrop"></div><div class="device-transition-content"><img alt=""><p></p></div><button class="device-transition-skip" type="button">跳过动画 →</button>';
      const icon=cover.querySelector('img');
      icon.src=image.src;
      cover.querySelector('p').textContent='正在进入 '+link.querySelector('h2').textContent+' 相册';
      cover.querySelector('button').onclick=go;
      document.body.append(cover);
      const duration=reduced.matches?700:1150;
      // Navigation must never depend on animation support: some mobile
      // browsers (e.g. the MIUI browser) never settle WAAPI .finished
      // promises, which left this overlay stuck. A plain timer guarantees
      // entry; the animation itself is pure CSS keyframes (transition.css).
      setTimeout(go,duration);
    };
    if(mobile.matches || reduced.matches || (navigator.maxTouchPoints>0 && Math.min(screen.width,screen.height)<=820)){fallback();return;}
    try {
      const response=await fetch(link.querySelector('.camera-art img').src);
      if(!response.ok)throw Error('Icon unavailable');
      const svg=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
      if(svg.localName!=='svg')throw Error('Invalid icon');
      const children=[...svg.children];
      const img=link.querySelector('.camera-art img');
      const box=img.getBoundingClientRect();
      const iconStyle=getComputedStyle(img);
      const width=img.offsetWidth,height=img.offsetHeight;
      const left=box.left+(box.width-width)/2,top=box.top+(box.height-height)/2;
      const transform=iconStyle.transform;
      overlay=document.createElement('div'); overlay.className='device-transition';
      overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','正在进入 '+link.querySelector('h2').textContent+' 相册');
      overlay.innerHTML='<div class="device-transition-backdrop"></div><div class="device-transition-camera"></div><button class="device-transition-skip" type="button">跳过动画 →</button>';
      const stage=overlay.querySelector('.device-transition-camera');
      stage.append(svg);stage.style.cssText=`left:${left}px;top:${top}px;width:${width}px;height:${height}px;transform:${transform}`;
      originalImage=img;img.style.visibility='hidden';
      document.body.append(overlay);document.body.style.overflow='hidden';
      const skip=overlay.querySelector('button');skip.onclick=go;skip.focus({preventScroll:true});
      overlay.onkeydown=e=>{if(e.key==='Escape')go();if(e.key==='Tab'){e.preventDefault();skip.focus({preventScroll:true});}};
      // Run the shutter, focus and ejection at the card's current position and size.
      const sony=id==='sony-a7m5', yashica=id==='yashica-electro-35-gs', flash=id==='polaroid-690', goCamera=id==='polaroid-go-gen3-blue', square=id==='fujifilm-sq1';
      if(!yashica){
        const shutter=children[sony?6:goCamera?6:square?13:flash?23:18];
        await tween(240,(_,p)=>{shutter.style.transform=`translateY(${Math.sin(p*Math.PI)*2.5}px)`;shutter.style.filter=`brightness(${1-Math.sin(p*Math.PI)*.35})`;});
      }
      let portal;
      if(sony){
        // Keep the approved sensor geometry and colours intact as it leaves the mount.
        portal=group(svg,children.slice(14,20));
        await tween(200,(_,p)=>portal.style.opacity=String(.55+.45*Math.abs(2*p-1)));
      }else if(yashica){
        const motion=window.YashicaFilmMotion.create(new XMLSerializer().serializeToString(svg));
        await tween(window.YashicaFilmMotion.duration,(_,p)=>{svg.innerHTML=motion(p*window.YashicaFilmMotion.duration/1000);});
        portal=svg.querySelector('[data-film-window]');
      }else if(goCamera || square){
        const light=document.createElementNS(ns,'rect');
        Object.entries(square?{x:164,y:59,width:36,height:24,rx:4,fill:'#fffdf1'}:{x:51,y:121,width:29,height:50,rx:5,fill:'#fffdf1'}).forEach(([k,v])=>light.setAttribute(k,v));svg.append(light);
        await tween(220,(_,p)=>{light.style.opacity=String(Math.sin(Math.PI*p));light.style.filter=`drop-shadow(0 0 ${Math.sin(Math.PI*p)*16}px #fff9cf)`;});light.remove();
        // Shared physical scale: Go 53.9×66.6, SQUARE 72×86, SX/600 88.47×107.52 mm.
        const unit=104/88.47,w=(square?72:53.9)*unit,h=(square?86:66.6)*unit,left=128-w/2,slot=square?43:201;
        portal=document.createElementNS(ns,'g');
        portal.innerHTML=`<rect x="${left}" y="0" width="${w}" height="${h}" rx="1.5" fill="#f6f4ee" stroke="#dce0d2" stroke-width=".7"/>`;
        const clip=document.createElementNS(ns,'g'),defs=document.createElementNS(ns,'defs');
        defs.innerHTML=`<clipPath id="small-paper-exit"><rect x="50" y="${square?-100:slot}" width="156" height="${square?143:150}"/></clipPath>`;svg.append(defs);clip.setAttribute('clip-path','url(#small-paper-exit)');svg.append(clip);clip.append(portal);
        let shield;
        if(goCamera){shield=document.createElementNS(ns,'path');shield.setAttribute('fill','#202b29');clip.append(shield);}
        await tween(780,t=>{
          const top=square?slot-h*t:slot-h+h*t;
          portal.setAttribute('transform',`translate(0 ${top})`);
          if(shield){const end=slot+h*t;shield.setAttribute('d',`M${left-1} ${slot}H${left+w+1}V${end-3}Q128 ${end+4} ${left-1} ${end-3}Z`);}
        });
        if(shield){
          // The photograph slips free while the flexible shield curls back toward the exit slot.
          await tween(220,()=>{});
          await tween(480,t=>{portal.setAttribute('transform',`translate(0 ${slot+14*t})`);const end=slot+h*(1-t);shield.setAttribute('d',`M${left-1} ${slot}H${left+w+1}V${end}Q128 ${end+8*(1-t)} ${left-1} ${end}Z`);});shield.remove();
        }
        svg.append(portal);clip.remove();
      }else{
        const lens=svg.querySelector('#centered-lens');
        const turn=document.createElementNS(ns,'g');while(lens.firstChild)turn.append(lens.firstChild);lens.append(turn);
        const cx=flash?133:137,cy=flash?164:153;
        await tween(520,t=>turn.setAttribute('transform',`rotate(${t*38} ${cx} ${cy})`));
        if(flash){
          const light=document.createElementNS(ns,'rect');Object.entries({x:152,y:48,width:47,height:32,rx:3,fill:'#fffdf1'}).forEach(([k,v])=>light.setAttribute(k,v));svg.append(light);
          await tween(220,(_,p)=>{light.style.opacity=String(Math.sin(Math.PI*p));light.style.filter=`drop-shadow(0 0 ${Math.sin(Math.PI*p)*18}px #fff9cf)`;});light.remove();
        }
        portal=document.createElementNS(ns,'g');
        const slot=flash?217:211;
        portal.innerHTML='<rect x="76" y="0" width="104" height="126.39" rx="2" fill="#f6f4ee" stroke="#dce0d2" stroke-width=".7"/>';
        svg.append(portal);
        // Reveal only the portion below the exit slot, so the paper emerges from the camera.
        const defs=document.createElementNS(ns,'defs');defs.innerHTML=`<clipPath id="exit-paper"><rect x="60" y="${slot}" width="140" height="140"/></clipPath>`;svg.append(defs);
        const clipped=document.createElementNS(ns,'g');clipped.setAttribute('clip-path','url(#exit-paper)');svg.append(clipped);clipped.append(portal);
        await tween(650,t=>portal.setAttribute('transform',`translate(0 ${slot-126+126*t})`));
        svg.append(portal);clipped.remove();
      }
      // Copy just the shared element into screen coordinates; the rest of the camera recedes.
      const rect=portal.getBoundingClientRect();
      const zoom=document.createElementNS(ns,'svg');
      const bounds=portal.getBBox();
      const clone=portal.cloneNode(true);clone.removeAttribute('transform');clone.style.opacity='1';
      zoom.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);zoom.append(clone);zoom.classList.add('device-transition-portal');
      zoom.style.cssText=`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
      overlay.append(zoom);portal.style.opacity='0';
      const scale=Math.max(innerWidth/rect.width,innerHeight/rect.height)*(yashica?1.7:1.12);
      const veil=document.createElement('div');veil.className='device-transition-veil';overlay.append(veil);
      await tween(950,(t,p)=>{
        stage.style.opacity=String(1-clamp(p*2));skip.style.opacity=String(1-clamp(p*2));
        const w=rect.width*(1+(scale-1)*t),h=rect.height*(1+(scale-1)*t);
        zoom.style.width=w+'px';zoom.style.height=h+'px';zoom.style.left=rect.left+((innerWidth-w)/2-rect.left)*t+'px';zoom.style.top=rect.top+((innerHeight-h)/2-rect.top)*t+'px';
        veil.style.opacity=String(clamp((p-.5)/.5));
      });go();
    }catch(error){console.warn('Device transition fallback:',error);overlay?.remove();restoreImage();document.body.style.overflow='';fallback();}
  });
})();
