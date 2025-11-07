;(function(){
  const cursor = document.getElementById('cursor');
  const dot = document.getElementById('cursorDot');
  if (!cursor || !dot || !window.gsap) return;

  let x = window.innerWidth/2, y = window.innerHeight/2;
  let tx = x, ty = y;

  const update = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = prefersReduced ? 1 : 0.18;
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    dot.style.transform = `translate(${tx}px, ${ty}px)`;
    requestAnimationFrame(update);
  };
  update();

  window.addEventListener('pointermove', (e)=>{ tx = e.clientX; ty = e.clientY; });

  // Hover scaling
  const scaleCursor = (s = 1, b = 2) => {
    gsap.to(cursor, { width: 20*s, height: 20*s, borderWidth: b, duration: 0.25, ease: 'power3.out' });
  };

  // Magnetic hover for elements with data-magnetic
  const magnets = new Set();
  const activateMagnet = (el) => {
    if (magnets.has(el)) return;
    magnets.add(el);
    const bounds = () => el.getBoundingClientRect();
    const onMove = (e) => {
      const r = bounds();
      const mx = ((e.clientX - (r.left + r.width/2)) / (r.width/2));
      const my = ((e.clientY - (r.top + r.height/2)) / (r.height/2));
      gsap.to(el, { x: mx*8, y: my*8, duration: 0.25, ease: 'power3.out' });
    };
    const onLeave = () => { gsap.to(el, { x: 0, y: 0, duration: 0.35, ease: 'power3.out' }); };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
  };

  document.querySelectorAll('[data-hover]').forEach(el => {
    el.addEventListener('pointerenter', ()=> scaleCursor(2.2, 2));
    el.addEventListener('pointerleave', ()=> scaleCursor(1, 2));
  });

  document.querySelectorAll('[data-magnetic="true"]').forEach(activateMagnet);

  // Hide cursor on touch devices
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) { cursor.style.display = 'none'; dot.style.display = 'none'; }
})();


