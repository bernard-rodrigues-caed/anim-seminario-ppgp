// ── Parâmetros ───────────────────────────────────────────────────────────────
const BUBBLE_CFG = {
  count:        20,
  radiusMin:    2.5,
  radiusMax:    9,
  colors:       ['#000000', '#9bb9f2', '#ffff03'],
  colorWeights: [0.50, 0.38, 0.12],
  opacityMin:   0.12,
  opacityMax:   0.72,

  spawnDuration: 1.9,   // duração total do spawn (s)
  delayMax:      0.55,  // escalonamento máximo de chegada (s)
  floatAmp:      3.0,   // amplitude de flutuação (px)
  floatFreq:     0.32,  // frequência base (Hz)
  spawnMargin:   50,    // distância além da borda de onde surgem (px)
};
// ─────────────────────────────────────────────────────────────────────────────

function pickColor(colors, weights) {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < colors.length; i++) {
    r -= weights[i];
    if (r <= 0) return colors[i];
  }
  return colors[colors.length - 1];
}

class BubbleAnim {
  constructor(container) {
    this.container = container;
    this.bubbles   = [];
    this.styleEl   = null;
    this.W = 0;
    this.H = 0;
  }

  start() {
    this.W = this.container.offsetWidth;
    this.H = this.container.offsetHeight;
    this._init();
    this._injectKeyframes();
    this._spawn();
  }

  stop() {
    if (this.styleEl) this.styleEl.remove();
    this.container.innerHTML = '';
  }

  _init() {
    const c      = BUBBLE_CFG;
    const { W, H } = this;

    this.bubbles = Array.from({ length: c.count }, (_, i) => {
      const r     = c.radiusMin + Math.random() * (c.radiusMax - c.radiusMin);
      const color = pickColor(c.colors, c.colorWeights);
      const alpha = c.opacityMin + Math.random() * (c.opacityMax - c.opacityMin);
      const delay = Math.random() * c.delayMax;

      const pad = r + 4;
      const tx  = pad + Math.random() * (W - 2 * pad);
      const ty  = pad + Math.random() * (H - 2 * pad);

      const side = Math.floor(Math.random() * 4);
      const m    = c.spawnMargin * (0.5 + Math.random() * 0.8);
      const sx   = side === 1 ? W + r + m : side === 3 ? -(r + m) : Math.random() * W;
      const sy   = side === 0 ? -(r + m)  : side === 2 ? H + r + m : Math.random() * H;

      const amp   = c.floatAmp * (0.6 + Math.random() * 0.8);
      const fxA   = amp * (0.4 + Math.random() * 0.6);
      const fyA   = amp * (0.4 + Math.random() * 0.6);
      const fxDur = 1 / (c.floatFreq * (0.7 + Math.random() * 0.6));
      const fyDur = 1 / (c.floatFreq * (0.7 + Math.random() * 0.6));

      return {
        i, r, color, alpha, delay,
        tx, ty, sx, sy,
        fxA, fyA, fxDur, fyDur,
        // Garantia de início em 0: o valor de ease-in-out alternate é 0
        // exatamente na metade de cada iteração (t = dur/2, 3dur/2, …).
        // O Math.round aleatório escolhe qual das duas meias-iterações usar,
        // variando a direção inicial sem introduzir salto visual.
        fxDelay: -(fxDur * (0.5 + Math.round(Math.random()))),
        fyDelay: -(fyDur * (0.5 + Math.round(Math.random()))),
      };
    });
  }

  // Injeta keyframes únicos por bolinha — cada eixo animado separadamente
  // para compor um caminho Lissajous suave sem JS em loop.
  _injectKeyframes() {
    const css = this.bubbles.map(({ i, fxA, fyA }) => `
      @keyframes bx${i} {
        from { transform: translateX(${(-fxA).toFixed(2)}px) }
        to   { transform: translateX(${fxA.toFixed(2)}px) }
      }
      @keyframes by${i} {
        from { transform: translateY(${(-fyA).toFixed(2)}px) }
        to   { transform: translateY(${fyA.toFixed(2)}px) }
      }
    `).join('');

    this.styleEl = document.createElement('style');
    this.styleEl.textContent = css;
    document.head.appendChild(this.styleEl);
  }

  _spawn() {
    const { spawnDuration } = BUBBLE_CFG;

    for (const b of this.bubbles) {
      // wrapper: posicionado no destino final; controla opacidade durante o spawn
      const wrap = document.createElement('div');
      wrap.style.cssText =
        `position:absolute;` +
        `left:${(b.tx - b.r).toFixed(2)}px;top:${(b.ty - b.r).toFixed(2)}px;` +
        `width:${(b.r * 2).toFixed(2)}px;height:${(b.r * 2).toFixed(2)}px;` +
        `opacity:0;`;

      // camada X: receberá a animação translateX
      const layerX = document.createElement('div');

      // camada Y + círculo visível: receberá translateY + estilo visual
      const dot = document.createElement('div');
      dot.style.cssText =
        `width:${(b.r * 2).toFixed(2)}px;height:${(b.r * 2).toFixed(2)}px;` +
        `border-radius:50%;background:${b.color};opacity:${b.alpha.toFixed(3)};`;

      layerX.appendChild(dot);
      wrap.appendChild(layerX);
      this.container.appendChild(wrap);

      // Spawn via Web Animations API — compositor-accelerated, sem rAF próprio
      const dur  = Math.max(300, (spawnDuration - b.delay) * 1000);
      const dx0  = (b.sx - b.tx).toFixed(2);
      const dy0  = (b.sy - b.ty).toFixed(2);

      const anim = wrap.animate(
        [
          { transform: `translate(${dx0}px,${dy0}px)`, opacity: 0 },
          { transform: 'translate(0px,0px)',            opacity: 1 },
        ],
        { duration: dur, delay: b.delay * 1000, easing: 'ease-in-out', fill: 'forwards' }
      );

      // Ao chegar: fixa posição via left/top e entrega a animação ao CSS — zero JS a partir daqui
      anim.onfinish = () => {
        wrap.style.opacity = '1';
        anim.cancel();

        layerX.style.animation =
          `bx${b.i} ${b.fxDur.toFixed(2)}s ease-in-out ${b.fxDelay.toFixed(2)}s infinite alternate`;
        dot.style.animation =
          `by${b.i} ${b.fyDur.toFixed(2)}s ease-in-out ${b.fyDelay.toFixed(2)}s infinite alternate`;
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.bubble-container').forEach(el => {
    new BubbleAnim(el).start();
  });
});
