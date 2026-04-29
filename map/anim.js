// ── Parâmetros de controle ────────────────────────────────────────────────────
const CONFIG = {
  // Viagem: da imagem até o destino
  travelDuration:  1.8,   // duração da viagem de cada bolinha (segundos)
  travelDelayMax:  2.5,   // atraso aleatório máximo antes de partir (segundos)
  travelEasing:    'easeOutCubic', // 'easeOutCubic' | 'easeInOutCubic'

  // Dispersão do ponto de origem dentro da imagem (px, raio a partir do centro)
  originSpread:    40,

  // Flutuação após chegada
  floatAmpScale:   0.6,   // multiplica todas as amplitudes de flutuação
  floatFreqScale:  1.0,   // multiplica todas as frequências de flutuação
  floatAmpMin:     1.5,   // amplitude mínima (px)
  floatAmpMax:     5.0,   // amplitude máxima (px)
  floatFadeIn:     0.8,   // tempo (s) para a flutuação ganhar amplitude total após a chegada
};
// ─────────────────────────────────────────────────────────────────────────────

function easeOutCubic(t)    { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
const ease = CONFIG.travelEasing === 'easeInOutCubic' ? easeInOutCubic : easeOutCubic;

fetch('Topo-PPGP.svg')
  .then(r => r.text())
  .then(svgText => {
    const container = document.getElementById('svg-container');
    container.innerHTML = svgText;

    const svg = container.querySelector('svg');

    // Calcula o centro da imagem como ponto de origem
    const imageEl = svg.querySelector('image');
    let originX = 0, originY = 0;
    if (imageEl) {
      const w  = parseFloat(imageEl.getAttribute('width')  || 0);
      const h  = parseFloat(imageEl.getAttribute('height') || 0);
      const tf = imageEl.getAttribute('transform') || '';
      const m  = tf.match(/translate\(\s*([\d.+-]+)\s+([\d.+-]+)\s*\)/);
      const tx = m ? parseFloat(m[1]) : 0;
      const ty = m ? parseFloat(m[2]) : 0;
      originX  = tx + w / 2;
      originY  = ty + h / 2;
    }

    const circles = Array.from(svg.querySelectorAll('circle'));
    const fa = CONFIG.floatAmpScale;
    const ff = CONFIG.floatFreqScale;

    const params = circles.map(circle => {
      const cx0 = parseFloat(circle.getAttribute('cx'));
      const cy0 = parseFloat(circle.getAttribute('cy'));
      const r   = parseFloat(circle.getAttribute('r'));

      const rawAmp = Math.min(CONFIG.floatAmpMax, Math.max(CONFIG.floatAmpMin, r * 0.8));
      const amp    = rawAmp * fa;

      // Ponto de partida: posição aleatória dentro da imagem
      const angle  = Math.random() * Math.PI * 2;
      const dist   = Math.random() * CONFIG.originSpread;
      const startX = originX + Math.cos(angle) * dist;
      const startY = originY + Math.sin(angle) * dist;

      // Preserva a opacidade original e zera para o fade-in
      const opacity0 = circle.style.opacity !== '' ? parseFloat(circle.style.opacity) : 1;
      circle.style.opacity = '0';

      // cx/cy ficam estáticos; toda movimentação usa transform (não recalcula geometria SVG)
      const offsetX0 = startX - cx0;
      const offsetY0 = startY - cy0;
      circle.setAttribute('transform', `translate(${offsetX0.toFixed(3)}, ${offsetY0.toFixed(3)})`);

      return {
        circle,
        offsetX0, offsetY0,
        opacity0,
        delay:   Math.random() * CONFIG.travelDelayMax,
        ampX1:   amp * (0.4 + Math.random() * 0.6),
        ampX2:   amp * (0.2 + Math.random() * 0.4),
        ampY1:   amp * (0.4 + Math.random() * 0.6),
        ampY2:   amp * (0.2 + Math.random() * 0.4),
        freqX1:  ff * (0.30 + Math.random() * 0.40),
        freqX2:  ff * (0.15 + Math.random() * 0.20),
        freqY1:  ff * (0.25 + Math.random() * 0.35),
        freqY2:  ff * (0.10 + Math.random() * 0.25),
        phaseX1: Math.random() * Math.PI * 2,
        phaseX2: Math.random() * Math.PI * 2,
        phaseY1: Math.random() * Math.PI * 2,
        phaseY2: Math.random() * Math.PI * 2,
      };
    });

    let startTime = null;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      for (const p of params) {
        const t = elapsed - p.delay;
        if (t < 0) continue;

        if (t < CONFIG.travelDuration) {
          // Fase 1: viagem da imagem até o destino (posição + opacidade)
          const progress = ease(t / CONFIG.travelDuration);
          const tx = p.offsetX0 * (1 - progress);
          const ty = p.offsetY0 * (1 - progress);
          p.circle.setAttribute('transform', `translate(${tx.toFixed(3)}, ${ty.toFixed(3)})`);
          p.circle.style.opacity = (progress * p.opacity0).toFixed(3);
        } else {
          // Fase 2: flutuação no destino
          const ft = t - CONFIG.travelDuration;
          // Fade-in suave para evitar salto na transição (fases aleatórias → dx/dy != 0 em ft=0)
          const fadeIn = CONFIG.floatFadeIn > 0
            ? easeInOutCubic(Math.min(1, ft / CONFIG.floatFadeIn))
            : 1;
          const dx = fadeIn * (
            p.ampX1 * Math.sin(2 * Math.PI * p.freqX1 * ft + p.phaseX1)
          + p.ampX2 * Math.sin(2 * Math.PI * p.freqX2 * ft + p.phaseX2));
          const dy = fadeIn * (
            p.ampY1 * Math.sin(2 * Math.PI * p.freqY1 * ft + p.phaseY1)
          + p.ampY2 * Math.cos(2 * Math.PI * p.freqY2 * ft + p.phaseY2));
          p.circle.setAttribute('transform', `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`);
        }
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  })
  .catch(err => {
    document.body.textContent = 'Erro ao carregar o SVG: ' + err.message;
  });
