// Interações do site. Sem dependências e sem dados guardados.

const PHONE = '351936018970';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Header: fundo sólido depois de sair do topo ── */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ── Menu móvel ── */
const menu = document.querySelector<HTMLElement>('[data-menu]');
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
if (menu && openBtn) {
  const closeBtn = menu.querySelector<HTMLButtonElement>('[data-menu-close]');
  const background = () => document.querySelectorAll<HTMLElement>('body > :not([data-menu]):not(script)');

  const focusables = () =>
    Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));

  const open = () => {
    menu.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('no-scroll');
    background().forEach((el) => (el.inert = true));
    requestAnimationFrame(() => menu.classList.add('is-open'));
    closeBtn?.focus();
  };
  const close = (returnFocus = true) => {
    menu.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('no-scroll');
    background().forEach((el) => (el.inert = false));
    menu.hidden = true;
    if (returnFocus) openBtn.focus();
  };

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', () => close());
  menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => close(false)));
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches && !menu.hidden) close(false);
  });
}

/* ── Formulário → mensagem no WhatsApp ── */
const clean = (value: FormDataEntryValue | null, max: number) =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const form = document.querySelector<HTMLFormElement>('[data-wa-form]');
if (form) {
  const error = form.querySelector<HTMLElement>('[data-form-error]');
  const nameInput = form.querySelector<HTMLInputElement>('input[name="nome"]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const nome = clean(data.get('nome'), 60);
    const negocio = clean(data.get('negocio'), 80);
    const servicos = data.getAll('servico').map((s) => clean(s, 30)).filter(Boolean);

    if (!nome) {
      if (error) {
        error.textContent = 'Escreva o seu nome para podermos responder.';
        error.hidden = false;
      }
      nameInput?.setAttribute('aria-invalid', 'true');
      nameInput?.focus();
      return;
    }
    if (error) error.hidden = true;
    nameInput?.removeAttribute('aria-invalid');

    let text = `Olá Wave Studio! Sou ${nome}`;
    if (negocio) text += `, de ${negocio}`;
    text += '.';
    if (servicos.length) text += ` Tenho interesse em: ${servicos.join(', ')}.`;
    text += ' Podemos falar?';

    const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = url;
  });
}

/* ── Carrossel 3D "Como trabalhamos": cartões em anel que roda sem parar ── */
const carousel = document.querySelector<HTMLElement>('[data-carousel]');
if (carousel) {
  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots = Array.from(carousel.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  const stage = carousel.querySelector<HTMLElement>('[data-stage]')!;
  const live = carousel.querySelector<HTMLElement>('[data-live]');
  const total = slides.length;
  const STEP = 360 / total;
  const SPEED = 360 / 30; // uma volta completa a cada 30 s (≈ 7,5 s por cartão)

  let spin = 0;
  let target: number | null = null;
  let front = -1;
  let visible = false;
  let dragging = false;
  let lastX = 0;
  let raf = 0;
  let last = 0;

  // Ângulo de -180 a 180
  const norm = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

  // Raio do anel (definido no CSS por tamanho de ecrã)
  let radius = 0;
  const measure = () => { radius = parseFloat(getComputedStyle(stage).getPropertyValue('--radius-3d')) || 220; };
  measure();
  new ResizeObserver(() => { measure(); apply(); }).observe(stage);

  const apply = () => {
    let best = 0;
    let bestAbs = 999;
    slides.forEach((slide, i) => {
      const a = norm(i * STEP + spin);
      const rad = (a * Math.PI) / 180;
      const c = Math.cos(rad);
      // Posição no anel: os laterais rodam só metade do ângulo, para continuarem legíveis.
      slide.style.transform = `translate3d(${radius * Math.sin(rad)}px, 0, ${radius * (c - 1)}px) rotateY(${a * 0.55}deg)`;
      const card = slide.firstElementChild as HTMLElement;
      card.style.opacity = String(0.22 + 0.78 * ((c + 1) / 2) ** 2.2);
      slide.style.visibility = Math.abs(a) < 125 ? 'visible' : 'hidden';
      if (Math.abs(a) < bestAbs) { bestAbs = Math.abs(a); best = i; }
    });
    if (best !== front) {
      front = best;
      slides.forEach((s, i) => s.classList.toggle('is-front', i === front));
      dots.forEach((d, i) => (i === front ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    }
  };

  const autoSpin = () => !reduceMotion.matches;

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!dragging) {
      if (target !== null) {
        const diff = target - spin;
        spin += diff * Math.min(1, dt * 5);
        if (Math.abs(diff) < 0.2) { spin = target; target = null; }
      } else if (autoSpin()) {
        spin -= SPEED * dt;
      }
    }
    apply();
    raf = requestAnimationFrame(tick);
  };

  const run = () => {
    cancelAnimationFrame(raf);
    if (visible && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };

  const go = (index: number) => {
    const i = ((index % total) + total) % total;
    const delta = norm(-i * STEP - spin);
    if (reduceMotion.matches) {
      spin += delta;
      apply();
    } else {
      target = spin + delta;
    }
    if (live) live.textContent = slides[i].getAttribute('aria-label') ?? '';
  };

  carousel.querySelector('[data-prev]')?.addEventListener('click', () => go(front - 1));
  carousel.querySelector('[data-next]')?.addEventListener('click', () => go(front + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(front + 1);
    if (e.key === 'ArrowLeft') go(front - 1);
  });

  // Rodar com o dedo ou o rato
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    target = null;
    lastX = e.clientX;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spin += (e.clientX - lastX) * 0.4;
    lastX = e.clientX;
    if (reduceMotion.matches || !visible) apply();
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Só anima quando está à vista (poupa bateria)
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run(); }, { rootMargin: '100px' }).observe(carousel);
  document.addEventListener('visibilitychange', run);

  apply();
}

/* ── Entrada suave dos blocos ao fazer scroll ── */
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    }),
    { rootMargin: '0px 0px -10% 0px' },
  );
  items.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

/* ── Ondas animadas no fundo da hero ── */
const heroBg = document.querySelector<HTMLElement>('.hero__bg');
const heroImg = heroBg?.querySelector<HTMLImageElement>('img');
if (heroBg && heroImg && !reduceMotion.matches) {
  const start = () => import('./ocean').then((m) => m.initOcean(heroBg, heroImg));
  // Arranca depois de a página estar pronta, para não atrasar o primeiro ecrã.
  const later = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300));
  if (heroImg.complete) later();
  else heroImg.addEventListener('load', later, { once: true });
}
