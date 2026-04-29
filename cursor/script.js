const cursor = document.createElement('div');
cursor.classList.add('custom-cursor');
cursor.style.opacity = '0'; // oculto até o primeiro mousemove para evitar aparição no centro
document.body.appendChild(cursor);

const clickable = 'a, button, [role="button"], input[type="submit"], input[type="button"], label, select';

document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  cursor.style.opacity = '1';
  cursor.classList.toggle('is-hovering', !!e.target.closest(clickable));
});

document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
document.addEventListener('mouseenter', () => cursor.style.opacity = '1');