function cargarSeccion(nombre) {
  fetch(`Pages/${nombre}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById('contenido').innerHTML = html;
    })
    .catch(err => {
      document.getElementById('contenido').innerHTML = `<p>Error al cargar ${nombre}</p>`;
    });
}

function initCarrusel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;
  let cards = Array.from(carousel.children);
  let isAnimating = false;

  window.moveCarousel = function(direction) {
    if (isAnimating) return;
    isAnimating = true;

    const cardWidth = cards[0].offsetWidth + 20;

    if (direction === 1) {
      const clone = cards[0].cloneNode(true);
      carousel.appendChild(clone);
      carousel.style.transition = 'transform 0.5s ease-in-out';
      carousel.style.transform = `translateX(-${cardWidth}px)`;

      setTimeout(() => {
        carousel.removeChild(cards[0]);
        carousel.style.transition = 'none';
        carousel.style.transform = 'translateX(0)';
        cards = Array.from(carousel.children);
        isAnimating = false;
      }, 500);
    } else {
      const clone = cards[cards.length - 1].cloneNode(true);
      carousel.insertBefore(clone, cards[0]);
      carousel.style.transition = 'none';
      carousel.style.transform = `translateX(-${cardWidth}px)`;

      requestAnimationFrame(() => {
        carousel.style.transition = 'transform 0.5s ease-in-out';
        carousel.style.transform = 'translateX(0)';
      });

      setTimeout(() => {
        carousel.removeChild(cards[cards.length - 1]);
        cards = Array.from(carousel.children);
        isAnimating = false;
      }, 500);
    }
  }
}


function cargarSeccion(seccion) {
  fetch(`/Frontend/Pages/${seccion}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById('contenido').innerHTML = html;
      if (seccion === 'home') {
        initCarrusel(); // ejecuta el código JS necesario
      }
    });
}

// Carga inicial
window.onload = () => cargarSeccion('home');
