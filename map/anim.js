// ── Parâmetros de controle ────────────────────────────────────────────────────
const CONFIG = {
  // Duração de cada fase do ciclo (segundos)
  holdBefore:        1.0,   // bolinha amarela isolada antes dos círculos aparecerem
  appearDuration:    4.0,   // círculos aparecem flutuando (fade-in inicial)
  floatDuration:     2.5,   // círculos flutuam em plena opacidade
  disappearDuration: 2.6,   // círculos desaparecem flutuando (fade-out final) — mín: disappearDelayMax + floatFadeIn
  holdAfter:         2.0,   // bolinha amarela isolada após os outros sumirem

  // Escalonamento do aparecimento/desaparecimento (atraso aleatório máximo por bolinha, em segundos)
  appearDelayMax:    2.0,
  disappearDelayMax: 2.0,

  // Flutuação
  floatAmpScale:     0.6,   // multiplica todas as amplitudes de flutuação
  floatFreqScale:    1.0,   // multiplica todas as frequências de flutuação
  floatAmpMin:       1.5,   // amplitude mínima (px)
  floatAmpMax:       5.0,   // amplitude máxima (px)
  floatFadeIn:       0.6,   // duração do fade-in e fade-out (s)
};
// ─────────────────────────────────────────────────────────────────────────────

function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

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

    const circles = Array.from(svg.querySelectorAll('circle'));
    const fa = CONFIG.floatAmpScale;
    const ff = CONFIG.floatFreqScale;

    const params = circles.map(circle => {
      const r      = parseFloat(circle.getAttribute('r'));
      const isMain = circle.id === 'main-circle';
      const rawAmp = Math.min(CONFIG.floatAmpMax, Math.max(CONFIG.floatAmpMin, r * 0.8));
      const amp    = rawAmp * fa * (isMain ? 2 : 1);
      const opacity0 = circle.style.opacity !== '' ? parseFloat(circle.style.opacity) : 1;
      if (!isMain) circle.style.opacity = '0';
      circle.setAttribute('transform', 'translate(0, 0)');

      return {
        circle,
        isMain,
        opacity0,
        delay:         Math.random() * CONFIG.appearDelayMax,
        disappearDelay: Math.random() * CONFIG.disappearDelayMax,
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

    const cycleDuration = CONFIG.holdBefore + CONFIG.appearDuration
                        + CONFIG.floatDuration + CONFIG.disappearDuration + CONFIG.holdAfter;
    const t1 = CONFIG.holdBefore;
    const t2 = t1 + CONFIG.appearDuration;
    const t3 = t2 + CONFIG.floatDuration;
    const t4 = t3 + CONFIG.disappearDuration;

    let startTime = null;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const cycleT  = elapsed % cycleDuration;

      for (const p of params) {
        if (p.isMain) {
          // Bolinha amarela: sempre visível, flutua continuamente
          const { dx, dy } = floatOffset(p, elapsed);
          p.circle.setAttribute('transform', `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`);
          continue;
        }

        if (cycleT < t1 || cycleT >= t4) {
          // Fase 1 / 5: invisível — bolinha amarela sozinha
          p.circle.style.opacity = '0';
          p.circle.setAttribute('transform', 'translate(0, 0)');
        } else {
          const floatT = cycleT - t1 - p.delay;
          const { dx, dy } = floatOffset(p, floatT);
          p.circle.setAttribute('transform', `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`);

          let opacity;
          if (cycleT < t2) {
            // Fase 2: aparecer (fade-in no início da fase)
            opacity = floatT <= 0 ? 0
              : easeInOutCubic(Math.min(1, floatT / CONFIG.floatFadeIn)) * p.opacity0;
          } else if (cycleT < t3) {
            // Fase 3: flutuar em plena opacidade
            opacity = p.opacity0;
          } else {
            // Fase 4: desaparecer (fade-out escalonado — inverso do aparecer)
            const timeInDisappear = cycleT - t3;
            if (timeInDisappear < p.disappearDelay) {
              opacity = p.opacity0;
            } else {
              const fadeT = timeInDisappear - p.disappearDelay;
              opacity = (1 - easeInOutCubic(Math.min(1, fadeT / CONFIG.floatFadeIn))) * p.opacity0;
            }
          }

          p.circle.style.opacity = opacity.toFixed(3);
        }
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  })
  .catch(err => {
    document.body.textContent = 'Erro ao carregar o SVG: ' + err.message;
  });
