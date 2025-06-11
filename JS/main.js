function cargarSeccion(nombre) {
  fetch(`Pages/${nombre}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById('contenido').innerHTML = html;

      if (nombre === 'home') {
        if (typeof initCarrusel === 'function') initCarrusel();
        if (typeof setupUploadArea === 'function') setupUploadArea();
      }
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

  window.moveCarousel = function (direction) {
    if (isAnimating || cards.length === 0) return;
    isAnimating = true;

    const cardWidth = cards[0].offsetWidth + 30;

    if (direction === 1) {
      const first = cards[0];
      const clone = first.cloneNode(true);
      carousel.appendChild(clone);

      carousel.style.transition = 'transform 0.5s ease-in-out';
      carousel.style.transform = `translateX(-${cardWidth}px)`;

      setTimeout(() => {
        carousel.removeChild(first);
        carousel.style.transition = 'none';
        carousel.style.transform = 'translateX(0)';
        cards = Array.from(carousel.children);
        isAnimating = false;
      }, 500);
    } else {
      const last = cards[cards.length - 1];
      const clone = last.cloneNode(true);
      carousel.insertBefore(clone, cards[0]);

      carousel.style.transition = 'none';
      carousel.style.transform = `translateX(-${cardWidth}px)`;

      requestAnimationFrame(() => {
        carousel.style.transition = 'transform 0.5s ease-in-out';
        carousel.style.transform = 'translateX(0)';
      });

      setTimeout(() => {
        carousel.removeChild(last);
        cards = Array.from(carousel.children);
        isAnimating = false;
      }, 500);
    }
  };
}

function setupUploadArea() {
  const uploadBox = document.getElementById("upload-box");
  const fileInput = document.getElementById("file-input");
  const uploadButton = document.getElementById("upload-button");
  const cancelButton = document.getElementById("cancel-button");
  const feedback = document.getElementById("upload-feedback");
  const section = document.getElementById("feature-section");

  if (!uploadBox || !fileInput || !uploadButton || !cancelButton) return;

  ["dragenter", "dragover"].forEach(event =>
    uploadBox.addEventListener(event, e => {
      e.preventDefault();
      uploadBox.style.borderColor = "#FFBB5B";
      feedback.textContent = "¡Suelta el archivo ahora!";
    })
  );

  ["dragleave", "drop"].forEach(event =>
    uploadBox.addEventListener(event, e => {
      e.preventDefault();
      uploadBox.style.borderColor = "#ccc";
    })
  );

  uploadBox.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    handlePDF(file);
  });

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => handlePDF(e.target.files[0]));

  cancelButton.addEventListener("click", () => {
    fileInput.value = "";
    feedback.textContent = "Suelta un PDF aquí o haz clic en \"SUBIR\"";
    section.classList.remove("show");
  });

  function handlePDF(file) {
    if (!file || file.type !== "application/pdf") {
      feedback.textContent = "⚠️ Solo se permite un archivo PDF.";
      section.classList.remove("show");
      return;
    }

    feedback.textContent = `✅ Archivo cargado: ${file.name}`;
    section.classList.add("show");
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('menu-items');
  let draggedItem = null;

  menu.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('menu-item')) {
      draggedItem = e.target;
      e.target.classList.add('dragging');
    }
  });

  menu.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('menu-item')) {
      e.target.classList.remove('dragging');
    }
  });

  menu.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const afterElement = getDragAfterElement(menu, e.clientX);
    if (!draggedItem) return;

    if (afterElement == null) {
      menu.appendChild(draggedItem);
    } else {
      menu.insertBefore(draggedItem, afterElement);
    }
  });

  function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.menu-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // 👇 Esta línea hace que se cargue la sección 'home'
  cargarSeccion('home');
});

