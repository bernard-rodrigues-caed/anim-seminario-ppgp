// ═══════════════════════════════════════════════════════════════════════════════
// CURSOR  (cursor/script.js aplicado na vitrine)
// Cria um cursor personalizado que segue o mouse e pulsa sobre elementos
// clicáveis. A vitrine usa iframes, portanto este cursor atua apenas na
// camada da página-raiz; dentro de cada iframe o componente opera de forma
// independente.
// ═══════════════════════════════════════════════════════════════════════════════

const cursor = document.createElement('div');
cursor.classList.add('custom-cursor');
document.body.appendChild(cursor);

const clickable =
    'a, button, [role="button"], input[type="submit"], input[type="button"], label, select';

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
    cursor.classList.toggle('is-hovering', !!e.target.closest(clickable));
});

document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });

// Oculta o cursor ao entrar em iframes: quando o mouse está sobre um iframe
// os eventos de mousemove deixam de chegar ao documento pai, fazendo o cursor
// ficar parado. A solução é simplesmente escondê-lo nesses momentos.
document.querySelectorAll('iframe').forEach(iframe => {
    iframe.addEventListener('mouseenter', () => { cursor.style.opacity = '0'; });
    iframe.addEventListener('mouseleave', () => { cursor.style.opacity = '1'; });
});
