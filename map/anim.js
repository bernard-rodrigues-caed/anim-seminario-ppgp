// ── Parâmetros de controle ────────────────────────────────────────────────────
const CONFIG = {
  // Duração de cada fase do ciclo (segundos)
  holdBefore:       1.0,   // imagem isolada antes dos círculos aparecerem
  appearDuration:   2.0,   // círculos flutuam no destino
  convergeDuration: 2.0,   // círculos convergem de volta à imagem
  holdAfter:        1.0,   // imagem isolada após a convergência

  // Escalonamento do aparecimento (atraso aleatório máximo por bolinha, em segundos)
  appearDelayMax:   0.4,

  // Flutuação
  floatAmpScale:    0.6,   // multiplica todas as amplitudes de flutuação
  floatFreqScale:   1.0,   // multiplica todas as frequências de flutuação
  floatAmpMin:      1.5,   // amplitude mínima (px)
  floatAmpMax:      5.0,   // amplitude máxima (px)
  floatFadeIn:      0.6,   // tempo (s) para opacidade e amplitude atingirem o valor final

  // Easing da convergência ('easeInCubic' acelera em direção à imagem | 'easeInOutCubic')
  convergeEasing:   'easeInCubic',
};
// ─────────────────────────────────────────────────────────────────────────────

function easeInCubic(t)     { return t * t * t; }
function easeInOutCubic(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

const convergeEase = CONFIG.convergeEasing === 'easeInOutCubic' ? easeInOutCubic : easeInCubic;

// Calcula o deslocamento de flutuação em um instante ft (segundos desde o início da fase appear)
function floatOffset(p, ft) {
  if (ft <= 0) return { dx: 0, dy: 0 };
  const fadeIn = CONFIG.floatFadeIn > 0
    ? easeInOutCubic(Math.min(1, ft / CONFIG.floatFadeIn))
    : 1;
  return {
    dx: fadeIn * (
      p.ampX1 * Math.sin(2 * Math.PI * p.freqX1 * ft + p.phaseX1)
    + p.ampX2 * Math.sin(2 * Math.PI * p.freqX2 * ft + p.phaseX2)),
    dy: fadeIn * (
      p.ampY1 * Math.sin(2 * Math.PI * p.freqY1 * ft + p.phaseY1)
    + p.ampY2 * Math.cos(2 * Math.PI * p.freqY2 * ft + p.phaseY2)),
  };
}

fetch('Topo-PPGP.svg')
  .then(r => r.text())
  .then(svgText => {
    const container = document.getElementById('svg-container');
    container.innerHTML = svgText;

    const svg = container.querySelector('svg');

    // Centro da imagem como ponto de convergência
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

      const isMain = circle.id === 'main-circle';
      const rawAmp = Math.min(CONFIG.floatAmpMax, Math.max(CONFIG.floatAmpMin, r * 0.8));
      const amp    = rawAmp * fa * (isMain ? 2 : 1);
      const opacity0 = circle.style.opacity !== '' ? parseFloat(circle.style.opacity) : 1;
      if (!isMain) circle.style.opacity = '0';
      circle.setAttribute('transform', 'translate(0, 0)');

      const delay  = Math.random() * CONFIG.appearDelayMax;
      const ampX1  = amp * (0.4 + Math.random() * 0.6);
      const ampX2  = amp * (0.2 + Math.random() * 0.4);
      const ampY1  = amp * (0.4 + Math.random() * 0.6);
      const ampY2  = amp * (0.2 + Math.random() * 0.4);
      const freqX1 = ff * (0.30 + Math.random() * 0.40);
      const freqX2 = ff * (0.15 + Math.random() * 0.20);
      const freqY1 = ff * (0.25 + Math.random() * 0.35);
      const freqY2 = ff * (0.10 + Math.random() * 0.25);
      const phaseX1 = Math.random() * Math.PI * 2;
      const phaseX2 = Math.random() * Math.PI * 2;
      const phaseY1 = Math.random() * Math.PI * 2;
      const phaseY2 = Math.random() * Math.PI * 2;

      // Posição de flutuação exata no instante em que a convergência começa (determinística)
      const floatParams = { ampX1, ampX2, ampY1, ampY2, freqX1, freqX2, freqY1, freqY2, phaseX1, phaseX2, phaseY1, phaseY2 };
      const convFloatT  = Math.max(0, CONFIG.appearDuration - delay);
      const convStart   = floatOffset(floatParams, convFloatT);

      return {
        circle,
        isMain,
        opacity0,
        delay,
        convStartDx: convStart.dx,
        convStartDy: convStart.dy,
        convEndX: originX - cx0,   // offset transform necessário para chegar ao centro da imagem
        convEndY: originY - cy0,
        ampX1, ampX2, ampY1, ampY2,
        freqX1, freqX2, freqY1, freqY2,
        phaseX1, phaseX2, phaseY1, phaseY2,
      };
    });

    const cycleDuration = CONFIG.holdBefore + CONFIG.appearDuration
                        + CONFIG.convergeDuration + CONFIG.holdAfter;
    const t1 = CONFIG.holdBefore;
    const t2 = t1 + CONFIG.appearDuration;
    const t3 = t2 + CONFIG.convergeDuration;

    let startTime = null;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const cycleT  = elapsed % cycleDuration;

      for (const p of params) {
        if (p.isMain) {
          // Círculo principal: sempre visível, flutua continuamente sem interrupção de ciclo
          const { dx, dy } = floatOffset(p, elapsed);
          p.circle.setAttribute('transform', `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`);
          continue;
        }

        if (cycleT < t1) {
          // Fase 1: imagem isolada — círculos invisíveis no destino
          p.circle.style.opacity = '0';
          p.circle.setAttribute('transform', 'translate(0, 0)');

        } else if (cycleT < t2) {
          // Fase 2: aparecer e flutuar
          const floatT = cycleT - t1 - p.delay;
          const { dx, dy } = floatOffset(p, floatT);
          p.circle.setAttribute('transform', `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`);
          if (floatT <= 0) {
            p.circle.style.opacity = '0';
          } else {
            p.circle.style.opacity = (easeInOutCubic(Math.min(1, floatT / CONFIG.floatFadeIn)) * p.opacity0).toFixed(3);
          }

        } else if (cycleT < t3) {
          // Fase 3: convergir para a imagem (posição + fade-out)
          const progress = convergeEase((cycleT - t2) / CONFIG.convergeDuration);
          const tx = p.convStartDx + (p.convEndX - p.convStartDx) * progress;
          const ty = p.convStartDy + (p.convEndY - p.convStartDy) * progress;
          p.circle.setAttribute('transform', `translate(${tx.toFixed(3)}, ${ty.toFixed(3)})`);
          p.circle.style.opacity = ((1 - progress) * p.opacity0).toFixed(3);

        } else {
          // Fase 4: imagem isolada novamente — círculos invisíveis
          p.circle.style.opacity = '0';
          p.circle.setAttribute('transform', 'translate(0, 0)');
        }
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  })
  .catch(err => {
    document.body.textContent = 'Erro ao carregar o SVG: ' + err.message;
  });
