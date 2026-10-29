// Ondas sobre a fotografia do mar da hero (WebGL).
// A imagem continua por baixo: se o WebGL falhar ou o utilizador preferir menos
// movimento, fica a fotografia parada.

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_img;
uniform vec2 u_res;
uniform vec2 u_img_size;
uniform float u_pos_x;
uniform float u_t;
varying vec2 v_uv;

// Converte a posição no ecrã para a posição na imagem (object-fit: cover + espelho).
vec2 toImage(vec2 uv, float zoom) {
  float ca = u_res.x / u_res.y;
  float ia = u_img_size.x / u_img_size.y;
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  scale /= zoom;
  vec2 off = (1.0 - scale) * vec2(u_pos_x, 0.5);
  return off + vec2(1.0 - uv.x, uv.y) * scale;
}

float luma(vec2 p) { return dot(texture2D(u_img, p).rgb, vec3(0.299, 0.587, 0.114)); }

void main() {
  float t = u_t;
  float zoom = 1.04 + 0.02 * sin(t * 0.12);
  vec2 iuv = toImage(v_uv, zoom);

  // Zona de espuma, desfocada: o campo de movimento fica suave e a imagem não rasga.
  float r = 0.05;
  float zone = (luma(iuv) + luma(iuv + vec2(r, 0.0)) + luma(iuv - vec2(r, 0.0))
              + luma(iuv + vec2(0.0, r)) + luma(iuv - vec2(0.0, r))) / 5.0;
  zone = smoothstep(0.15, 0.65, zone);

  // Ondulação da água: ondas largas e lentas (calculadas no ecrã, para terem o
  // mesmo tamanho no telemóvel e no desktop), sem ruído de pixel.
  vec2 s = v_uv * vec2(u_res.x / u_res.y, 1.0);
  vec2 flow = vec2(
    sin(s.y * 5.0 + t * 0.6) + 0.5 * sin(s.y * 8.0 - s.x * 3.0 + t * 0.9),
    sin(s.x * 4.0 - t * 0.5) + 0.5 * sin(s.x * 7.0 + s.y * 3.0 - t * 0.7)
  ) * 0.0016;

  // A vaga: a espuma avança sobre a água escura e recua, devagar,
  // com o rebentamento a descer ao longo da costa.
  float wave = 0.5 + 0.5 * sin(t * 0.45 - s.y * 2.2);
  wave = wave * wave * (3.0 - 2.0 * wave);
  vec2 surge = vec2(-0.0045, 0.0008) * wave * zone;

  vec3 col = texture2D(u_img, iuv + flow + surge).rgb;

  // A espuma fica um pouco mais branca quando a vaga chega.
  col = mix(col, col * 1.12 + 0.02, wave * zone * 0.6);

  gl_FragColor = vec4(col, 1.0);
}`;

// Versão maior disponível no <picture> (a textura não pode ser a pequena do telemóvel).
function largestSource(img: HTMLImageElement): string {
  const picture = img.closest('picture');
  const sets = [
    ...Array.from(picture?.querySelectorAll('source[type="image/webp"]') ?? []).map((s) => s.getAttribute('srcset') ?? ''),
    img.getAttribute('srcset') ?? '',
  ];
  let best = { url: img.currentSrc || img.src, w: 0 };
  for (const set of sets) {
    for (const part of set.split(',')) {
      const [url, size] = part.trim().split(/\s+/);
      const w = parseInt(size, 10);
      if (url && w > best.w) best = { url, w };
    }
    if (best.w) break;
  }
  return best.url;
}

export function initOcean(container: HTMLElement, img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ocean__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  const uRes = u('u_res');
  const uImg = u('u_img_size');
  const uPos = u('u_pos_x');
  const uT = u('u_t');

  const source = new Image();
  source.decoding = 'async';
  source.src = largestSource(img);

  let raf = 0;
  let visible = true;
  let ready = false;
  let start = performance.now();

  const resize = () => {
    // Resolução nativa do ecrã (até 2x), para a imagem não ficar desfocada nem pixelizada.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(container.clientWidth * dpr);
    const h = Math.round(container.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
    const pos = parseFloat(getComputedStyle(img).objectPosition) || 50;
    gl.uniform1f(uPos, pos / 100);
    if (ready) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const frame = (now: number) => {
    gl.uniform1f(uT, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    if (ready && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  source.addEventListener('load', () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.uniform2f(uImg, source.naturalWidth, source.naturalHeight);

    container.appendChild(canvas);
    ready = true;
    resize();
    start = performance.now();
    gl.uniform1f(uT, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(() => canvas.classList.add('is-ready'));
    run();
  });

  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(container);
  document.addEventListener('visibilitychange', run);
}
