// leak-field.jsx — ambient canvas "leak field": drifting enquiry dots.
// Modes: 'drift'    (steps — forest dots; clay share = lossRate, falls faster)
//        'converge' (calculating — dots pull into a single clay point)
//        'fall'     (result — sparse clay dots keep falling)
// ≤60 dots, one canvas, subtle pointer/tilt parallax. Reduced motion → nothing.

const { useRef: useRefLF, useEffect: useEffectLF } = React;

function LeakField({ mode = 'drift', lossRate = 0.12, dark = false, density = 54, parallax = false, style }) {
  const hostRef = useRefLF(null);
  const propsRef = useRefLF({ mode, lossRate, dark });
  propsRef.current = { mode, lossRate, dark };

  useEffectLF(() => {
    if (window.IDS_reducedMotion && window.IDS_reducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 1, h = 1;
    function resize() {
      const r = host.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    resize();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(host); }

    // Evenly-spread loss keys, shuffled, so which dots "turn clay" is
    // spatially random but stable as lossRate rises.
    const N = Math.max(8, Math.min(60, density));
    const keys = [];
    for (let i = 0; i < N; i++) keys.push((i + 0.5) / N);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = keys[i]; keys[i] = keys[j]; keys[j] = t; }
    const dots = keys.map((k) => ({
      x: Math.random(), y: Math.random(),
      r: 0.9 + Math.random() * 1.5,
      v: 0.012 + Math.random() * 0.02,        // fraction of height / second
      sway: Math.random() * Math.PI * 2,
      swaySpd: 0.25 + Math.random() * 0.5,
      swayAmt: 3 + Math.random() * 5,
      a: 0.16 + Math.random() * 0.3,
      lossKey: k,
      cd: Math.random() * 0.5,                // converge delay (s)
      cs: false, sx: 0, sy: 0,                // converge start snapshot
    }));

    // Parallax — pointer on desktop, tilt on device (gracefully absent).
    let tx = 0, ty = 0, px = 0, py = 0;
    function onPointer(e) {
      tx = ((e.clientX / (window.innerWidth || 1)) - 0.5) * 10;
      ty = ((e.clientY / (window.innerHeight || 1)) - 0.5) * 8;
    }
    function onTilt(e) {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 40)) * 8;
      ty = Math.max(-1, Math.min(1, (e.beta - 40) / 40)) * 6;
    }
    if (parallax) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('deviceorientation', onTilt, { passive: true });
    }

    let raf = 0, last = performance.now(), convergeT0 = null, lastMode = null;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p2 = propsRef.current;
      if (p2.mode !== lastMode) {
        lastMode = p2.mode;
        if (p2.mode === 'converge') { convergeT0 = now; for (const d of dots) d.cs = false; }
        else convergeT0 = null;
      }

      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(px, py);

      const inkBase = p2.dark ? '247,243,237' : '31,74,55';
      const inkClay = p2.dark ? '212,149,107' : '184,121,77';
      const aScale = p2.dark ? 0.8 : 1;
      const ct = convergeT0 == null ? 0 : (now - convergeT0) / 1000;

      for (const d of dots) {
        if (p2.mode === 'fall' && d.lossKey > 0.3) continue;   // sparse subset
        const isClay = p2.mode === 'fall' ? true : d.lossKey < p2.lossRate;

        d.sway += d.swaySpd * dt;
        d.y += d.v * (isClay ? 2.6 : 1) * (p2.mode === 'fall' ? 0.8 : 1) * dt;
        if (d.y > 1.03) { d.y = -0.03; d.x = Math.random(); }

        let X = d.x * w + Math.sin(d.sway) * d.swayAmt;
        let Y = d.y * h;
        let alpha = d.a * aScale;
        let radius = d.r;
        let clay = isClay;

        if (p2.mode === 'converge') {
          if (!d.cs) { d.cs = true; d.sx = X / w; d.sy = Y / h; }
          const p = Math.max(0, Math.min(1, (ct - d.cd) / 1.0));
          const e = p * p * p;                 // accelerate inward
          if (e >= 1) continue;                // absorbed
          X = (d.sx + (0.5 - d.sx) * e) * w;
          Y = (d.sy + (0.45 - d.sy) * e) * h;
          alpha = (d.a + 0.25 * e) * aScale * (1 - e * 0.7);
          radius = d.r * (1 - 0.5 * e);
          if (e > 0.45) clay = true;
        }

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + (clay ? inkClay : inkBase) + ',' + alpha.toFixed(3) + ')';
        ctx.arc(X, Y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Converge core — the compressed clay point, breathing
      if (p2.mode === 'converge') {
        const g = Math.max(0, Math.min(1, (ct - 0.5) / 1.1));
        if (g > 0) {
          const pulse = 1 + Math.sin(now / 130) * 0.08 * g;
          const R = (3 + 9 * g) * pulse;
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + inkClay + ',' + (0.08 + 0.10 * g).toFixed(3) + ')';
          ctx.arc(w / 2, h * 0.45, R * 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + inkClay + ',' + (0.45 + 0.4 * g).toFixed(3) + ')';
          ctx.arc(w / 2, h * 0.45, R, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (parallax) {
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('deviceorientation', onTilt);
      }
      if (canvas.parentElement === host) host.removeChild(canvas);
    };
  }, []);

  return <div ref={hostRef} className="leak-field" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', ...style }}></div>;
}

Object.assign(window, { LeakField });
