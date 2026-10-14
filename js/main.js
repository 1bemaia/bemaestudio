// BEMA Estúdio — main.js
// Revelações por seção, motions, motion de entrada, malha reativa e o polvo do aquário.

const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

// Revela uma vez quando entra na tela. Nunca deixa conteúdo escondido.
(() => {
  const alvos = document.querySelectorAll('[data-reveal]');
  if (!alvos.length) return;
  if (!('IntersectionObserver' in window)) { alvos.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  alvos.forEach((el) => io.observe(el));
  // rede de segurança: o que estiver na tela depois do load aparece de qualquer jeito
  window.addEventListener('load', () => setTimeout(() => {
    alvos.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
  }, 2500));
})();

// Motion 01: toca em loop só enquanto está na tela; parado com movimento reduzido.
(() => {
  const video = document.querySelector('.abertura__video');
  if (!video) return;
  let visivel = false;

  const aplica = () => {
    if (visivel && !reduzMovimento.matches) video.play().catch(() => {});
    else video.pause();
  };

  video.removeAttribute('autoplay');
  video.pause();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visivel = e[0].isIntersecting; aplica(); }, { threshold: 0.2 }).observe(video);
  } else { visivel = true; aplica(); }
  reduzMovimento.addEventListener('change', aplica);
})();

// Motion 02: vídeo normal, em loop e na velocidade normal; a rolagem não controla o tempo.
// Toca quando está perto da tela e pausa quando se afasta; não mexe em currentTime enquanto toca.
// Com movimento reduzido, fica parado no quadro em que o polvo já está desenhado (uma única busca).
(() => {
  const video = document.querySelector('.desenho__video');
  if (!video) return;
  const QUADRO_PRONTO = 0.9; // fração do vídeo em que o polvo está completo
  let visivel = false;

  const aplica = () => {
    if (reduzMovimento.matches) {
      video.pause();
      const mostraPronto = () => { video.currentTime = video.duration * QUADRO_PRONTO; };
      if (video.readyState >= 1) mostraPronto(); else video.addEventListener('loadedmetadata', mostraPronto, { once: true });
    } else if (visivel) video.play().catch(() => {});
    else video.pause();
  };

  video.removeAttribute('autoplay'); // quem decide é a visibilidade (e o movimento reduzido)
  video.pause();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visivel = e[0].isIntersecting; aplica(); }, { rootMargin: '25% 0px' }).observe(video);
  } else { visivel = true; aplica(); }
  reduzMovimento.addEventListener('change', aplica);
})();

// Motion de entrada: o polvo oficial sobe de baixo da tela e puxa a cortina vermelha, revelando o site.
// Um só relógio move os dois: a borda de baixo da cortina fica logo abaixo dos tentáculos, então ela só
// começa a subir quando o polvo a alcança e daí sobe presa a ele. Só transform. No fim, cortina e polvo
// saem do DOM e a rolagem volta. Com movimento reduzido não roda (a classe nem é posta no <html>).
(() => {
  const raiz = document.documentElement;
  const entrada = document.querySelector('.entrada');
  if (!entrada) return;
  if (!raiz.classList.contains('com-entrada')) { entrada.remove(); return; }
  const cortina = entrada.querySelector('.entrada__cortina');
  const polvo = entrada.querySelector('.entrada__polvo');
  const DURACAO = 1700; // ms

  // cubic-bezier(x1, y1, x2, y2), resolvido por bisseção (x é monotônico)
  const bezier = (x1, y1, x2, y2) => (x) => {
    const b = (a1, a2, t) => 3 * a1 * t * (1 - t) ** 2 + 3 * a2 * t * t * (1 - t) + t ** 3;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (b(x1, x2, t) < x) lo = t; else hi = t; }
    return b(y1, y2, t);
  };
  const curva = bezier(0.7, 0, 0.25, 1); // perto de (.76, 0, .24, 1), arrancando um pouco antes
  const veloc = (p) => (curva(Math.min(1, p + 0.01)) - curva(Math.max(0, p - 0.01))) / 0.02;
  let vMax = 0; for (let i = 0; i <= 100; i++) vMax = Math.max(vMax, veloc(i / 100));

  const termina = () => { entrada.remove(); raiz.classList.remove('com-entrada'); };

  const comeca = () => {
    scrollTo(0, 0);
    const H = cortina.offsetHeight, alt = polvo.offsetHeight;
    const yIni = H + alt * 0.6;  // centro do polvo: começa logo abaixo da tela
    const yFim = -alt * 0.75;    // termina acima do topo, já com a cortina fora
    let t0 = 0;
    const quadro = (agora) => {
      if (!t0) t0 = agora;
      const p = Math.min(1, (agora - t0) / DURACAO);
      const cy = yIni + (yFim - yIni) * curva(p);
      const borda = Math.min(H, cy + alt * 0.5); // a cortina vai presa logo abaixo dos tentáculos
      cortina.style.transform = `translate3d(0, ${(borda - H).toFixed(1)}px, 0)`;

      // corpo: achatado no começo, esticado no impulso, normal no fim; rotação e balanço sutis
      const v = veloc(p) / vMax, calma = (1 - v) * (1 - p);
      const sx = 1 + 0.03 * calma - 0.03 * v, sy = 1 - 0.03 * calma + 0.04 * v;
      const rot = Math.sin(p * Math.PI * 2) * 2, dx = Math.sin(p * Math.PI * 1.5) * 8;
      polvo.style.transform = `translate3d(${dx.toFixed(1)}px, ${(cy - alt / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

      if (p < 1) requestAnimationFrame(quadro); else termina();
    };
    requestAnimationFrame(quadro);
  };

  // espera a fonte do hero (no máximo 600 ms) para revelar o site já pronto
  Promise.race([document.fonts ? document.fonts.ready : null, new Promise((ok) => setTimeout(ok, 600))])
    .then(() => requestAnimationFrame(comeca));
})();

// Malha reativa de pontos (DNA do site antigo, adaptada: só pontos, sem linhas nem cruzes).
// Os pontos crescem e são atraídos pelo cursor/dedo; sem ponteiro, um foco invisível passeia devagar.
(() => {
  const telas = [...document.querySelectorAll('.malha')];
  if (!telas.length) return;
  const PRETO = getComputedStyle(document.documentElement).getPropertyValue('--bema-preto').trim() || '#111111';

  const ponteiro = { x: -9999, y: -9999, tipo: 'mouse', quando: 0, dentro: false };
  const registra = (e) => { ponteiro.x = e.clientX; ponteiro.y = e.clientY; ponteiro.tipo = e.pointerType; ponteiro.quando = performance.now(); ponteiro.dentro = true; };
  addEventListener('pointermove', registra, { passive: true });
  addEventListener('pointerdown', registra, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { ponteiro.dentro = false; });

  function desenha(m, t) {
    const { ctx, W, H, S, R } = m;
    ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PRETO;
    ctx.beginPath();
    const fase = t * 0.0012;
    const cols = Math.ceil(W / S) + 1, rows = Math.ceil(H / S) + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const bx = i * S + S / 2, by = j * S + S / 2;
        const dx = m.px - bx, dy = m.py - by;
        const d = Math.hypot(dx, dy);
        const f = d < R ? Math.pow(1 - d / R, 2) * m.st : 0;
        const x = bx + dx * f * 0.45, y = by + dy * f * 0.45;
        const pulso = 0.5 + 0.5 * Math.sin(fase + ((i + j) & 1) * Math.PI);
        const raio = 1 + 0.7 * pulso + 4.4 * f;
        ctx.moveTo(x + raio, y);
        ctx.arc(x, y, raio, 0, 6.2832);
      }
    }
    ctx.fill();
  }

  const malhas = telas.map((cv) => {
    const m = { cv, ctx: cv.getContext('2d'), W: 0, H: 0, dpr: 1, S: 28, R: 180, px: 0, py: 0, st: 0.5, visivel: false };
    m.mede = () => {
      const r = cv.parentElement.getBoundingClientRect();
      m.dpr = Math.min(devicePixelRatio || 1, 2);
      m.W = r.width; m.H = r.height;
      m.S = m.W > 900 ? 28 : 22;
      m.R = m.W > 900 ? 180 : 130;
      cv.width = Math.round(m.W * m.dpr); cv.height = Math.round(m.H * m.dpr);
      m.px = m.W * 0.5; m.py = m.H * 0.45;
      desenha(m, 0);
    };
    if ('ResizeObserver' in window) new ResizeObserver(m.mede).observe(cv.parentElement);
    m.mede();
    return m;
  });

  let rodando = false;
  const quadro = (t) => {
    let algum = false;
    for (const m of malhas) {
      if (!m.visivel) continue;
      algum = true;
      const r = m.cv.getBoundingClientRect();
      const recente = ponteiro.tipo === 'mouse' ? ponteiro.dentro : performance.now() - ponteiro.quando < 1400;
      const lx = ponteiro.x - r.left, ly = ponteiro.y - r.top;
      const sobre = recente && lx >= 0 && ly >= 0 && lx <= m.W && ly <= m.H;
      let tx, ty, tst;
      if (sobre) { tx = lx; ty = ly; tst = 1; }
      else { tx = m.W * (0.5 + 0.34 * Math.sin(t * 0.0006)); ty = m.H * (0.45 + 0.25 * Math.sin(t * 0.00047 + 1)); tst = 0.5; }
      m.px += (tx - m.px) * 0.14; m.py += (ty - m.py) * 0.14; m.st += (tst - m.st) * 0.08;
      desenha(m, t);
    }
    if (algum && !reduzMovimento.matches) requestAnimationFrame(quadro); else rodando = false;
  };
  const liga = () => { if (!rodando && !reduzMovimento.matches) { rodando = true; requestAnimationFrame(quadro); } };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        const m = malhas.find((x) => x.cv === e.target);
        if (m) m.visivel = e.isIntersecting;
      }
      liga();
    });
    malhas.forEach((m) => io.observe(m.cv));
  } else { malhas.forEach((m) => { m.visivel = true; }); liga(); }

  reduzMovimento.addEventListener('change', () => { malhas.forEach((m) => { m.st = 0.5; desenha(m, 0); }); liga(); });
})();


// Aquário: um único polvo nada sozinho pela página inteira, no seu próprio relógio. A rolagem não move
// o polvo: ela só muda que parte do aquário aparece, como qualquer conteúdo da página.
// Percurso: curva suave (Catmull-Rom) por pontos sorteados nas áreas vermelhas/pretas livres de branco
// (hero acima do logotipo, Motion 01, Motion 02), de preferência nas laterais. Para trocar de área, sai
// pela borda da página, nada por fora (invisível, mais rápido) e volta. Só transform; com movimento
// reduzido, o aquário fica escondido (CSS).
// Nado de lula (jato): cada braçada é um impulso curto seguido de deslize que desacelera. O corpo contrai
// no impulso e se expande no deslize, inclina para o lado em que avança (no máximo ~20°) e balança de leve.
(() => {
  const aquario = document.querySelector('.aquario');
  const polvo = aquario?.querySelector('.polvo');
  const pagina = document.querySelector('.pagina');
  if (!aquario || !polvo || !pagina) return;

  let ESCALA = 0.24;    // escala 1 ± ESCALA: desktop 145px × 0,76–1,24 = 110–180px; celular 100px × 0,8–1,2 = 80–120px
  let sentido = 1, restam = 2; // vai e volta pela página: alguns pontos em cada área, depois a próxima
  let W = 0, lado = 0, alto = 0, vel = 0, topoPagina = 0, zonas = [];
  let pts = [], t = 0, comp = 1, relogio = 0, antes = 0, rodando = false, ang = 0;
  let fase = 0, periodo = 1.6;                 // braçada atual (0–1) e sua duração em s
  const pos = { x: 0, y: 0 }, v = { x: 0, y: 0 }; // v: velocidade suavizada, para a inclinação

  // impulso ao longo da braçada: sobe rápido (20% do tempo) e decai no deslize
  const impulso = (p) => (p < 0.2 ? Math.sin((p / 0.2) * Math.PI / 2) : Math.exp(-(p - 0.2) * 4.5));
  // média do fator de velocidade, para a velocidade média continuar sendo "vel"
  const MEDIA = (() => { let m = 0; for (let i = 0; i < 400; i++) m += 0.35 + 1.6 * impulso(i / 400); return m / 400; })();

  const naPagina = (el) => { const r = el.getBoundingClientRect(), p = pagina.getBoundingClientRect(); return [r.top - p.top, r.bottom - p.top]; };
  const entre = (a, b) => a + Math.random() * (b - a);
  const margem = () => alto * (0.5 + ESCALA);

  // um ponto dentro da área z, quase sempre numa lateral (às vezes cortado pela borda), às vezes no meio
  const ponto = (z) => {
    const [zt, zb] = zonas[z];
    const y = entre(zt + margem() - alto / 2, Math.max(zt + margem() - alto / 2, zb - margem() - alto / 2));
    const r = Math.random();
    const x = r < 0.4 ? entre(-lado * 0.45, W * 0.2) : r < 0.8 ? entre(W * 0.8 - lado, W - lado * 0.55) : entre(W * 0.3, W * 0.7 - lado);
    return { x, y, z };
  };
  // fora da página, na lateral mais próxima, na altura y
  const fora = (de, y, z) => ({ x: de.x + lado / 2 < W / 2 ? -lado * 1.7 : W + lado * 0.7, y, z, fora: true });

  const proximo = () => {
    const ult = pts[pts.length - 1];
    let z = ult.z;
    if (zonas.length > 1 && --restam <= 0) {
      if (z + sentido < 0 || z + sentido >= zonas.length) sentido = -sentido;
      z += sentido;
      restam = 2 + Math.floor(Math.random() * 2); // 2 ou 3 pontos na próxima área
    }
    if (z !== ult.z) {
      // entre as áreas sempre há branco (logotipo e letreiro, serviços): passa por fora da página
      const desce = z > ult.z;
      const saida = desce ? zonas[ult.z][1] - margem() - alto / 2 : zonas[ult.z][0] + margem() - alto / 2;
      const chegada = desce ? zonas[z][0] + margem() - alto / 2 : zonas[z][1] - margem() - alto / 2;
      const f = fora(ult, saida, ult.z);
      pts.push(f, { ...f, y: chegada, z });
    }
    pts.push(ponto(z));
  };

  const recomeca = () => {
    // zona mais próxima da posição atual (ou o hero, na primeira vez)
    let z = 0, melhor = Infinity;
    zonas.forEach(([zt, zb], i) => { const d = pos.y < zt ? zt - pos.y : pos.y > zb ? pos.y - zb : 0; if (d < melhor) { melhor = d; z = i; } });
    const inicio = pts.length ? { x: pos.x, y: pos.y, z } : { x: W + lado * 0.2, y: (zonas[0][0] + zonas[0][1]) / 2 - alto / 2, z: 0 };
    if (!pts.length) Object.assign(pos, inicio);
    pts = [inicio, inicio];
    while (pts.length < 5) proximo();
    t = 0; comp = 1;
  };

  const mede = () => {
    W = aquario.clientWidth; lado = polvo.offsetWidth; alto = polvo.offsetHeight;
    ESCALA = W < 768 ? 0.2 : 0.24;
    vel = W < 768 ? 31 : 51; // px/s em média: +30% sobre o nado anterior (que tinha média de 0,85 × 28 e 0,85 × 46)
    topoPagina = pagina.getBoundingClientRect().top + scrollY;
    const hero = document.querySelector('.hero'), logo = document.querySelector('.hero__marca');
    const v1 = document.querySelector('.abertura__video'), v2 = document.querySelector('.desenho');
    zonas = [
      hero && [naPagina(hero)[0], logo ? naPagina(logo)[0] : naPagina(hero)[1]],
      v1 && naPagina(v1), v2 && naPagina(v2),
    ].filter((z) => z && z[1] - z[0] > 2 * margem());
    if (!zonas.length) return;
    recomeca();
    liga();
  };

  // Catmull-Rom entre pts[1] e pts[2]
  const curva = (k, u) => {
    const [a, b, c, d] = [pts[0][k], pts[1][k], pts[2][k], pts[3][k]];
    return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  };

  const quadro = (agora) => {
    const dt = Math.min(0.05, (agora - (antes || agora)) / 1000); antes = agora;
    relogio += dt;
    // braçada: duração varia um pouco a cada ciclo (1,4–1,8 s)
    fase += dt / periodo;
    if (fase >= 1) { fase -= 1; periodo = entre(1.4, 1.8); }
    const c = impulso(fase);

    const p1 = pts[1], p2 = pts[2];
    comp = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 1.1);
    const ritmo = (p1.fora && p2.fora ? 4 : 1) * vel * (0.35 + 1.6 * c) / MEDIA;
    t += (ritmo * dt) / comp;
    while (t >= 1) { t -= 1; pts.shift(); while (pts.length < 5) proximo(); }
    let x = curva('x', t);
    let y = curva('y', t);
    // dentro de uma área, a curva não pode passar da borda (Catmull-Rom às vezes passa um pouco)
    if (p1.z === p2.z && !(p1.fora && p2.fora) && zonas[p1.z]) {
      const [zt, zb] = zonas[p1.z];
      y = Math.min(zb - margem() - alto / 2, Math.max(zt + margem() - alto / 2, y));
    }
    const k = Math.min(1, dt * 4);
    v.x += ((x - pos.x) / Math.max(dt, 0.001) - v.x) * k;
    v.y += ((y - pos.y) / Math.max(dt, 0.001) - v.y) * k;
    pos.x = x; pos.y = y;

    // só escreve quando o polvo está perto da parte visível da página
    const topoTela = topoPagina - scrollY;
    if (y + topoTela < innerHeight + alto && y + topoTela > -alto * 2) {
      const rapidez = Math.max(1, Math.hypot(v.x, v.y));
      const lado_ = Math.max(-1, Math.min(1, v.x / rapidez));
      // balanço lateral sutil, perpendicular ao caminho
      const bal = Math.sin(relogio * 2.1) * 2.5;
      x += (-v.y / rapidez) * bal; y += (v.x / rapidez) * bal;
      // inclina para onde avança; um pouco mais no impulso; nunca roda
      const alvoAng = lado_ * 16 + lado_ * 3 * c + Math.sin(relogio * 1.7) * 1.2;
      ang += (alvoAng - ang) * Math.min(1, dt * 3.5);
      // tamanho base respira devagar; o corpo contrai no impulso e expande no deslize
      const s = 1 + ESCALA * Math.sin(relogio * 0.11);
      const sx = s * (1 - 0.07 * c + 0.015 * (1 - c)), sy = s * (1 + 0.05 * c - 0.01 * (1 - c));
      polvo.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${ang.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    }
    if (!reduzMovimento.matches) requestAnimationFrame(quadro); else { rodando = false; antes = 0; }
  };
  const liga = () => { if (!rodando && zonas.length && !reduzMovimento.matches) { rodando = true; requestAnimationFrame(quadro); } };

  if ('ResizeObserver' in window) new ResizeObserver(mede).observe(pagina); else addEventListener('resize', mede);
  reduzMovimento.addEventListener('change', liga);
  mede();
})();
