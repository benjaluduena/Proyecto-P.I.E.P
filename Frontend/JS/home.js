
const uploadBox = document.querySelector('.upload-box');
const uploadText = document.querySelector('.upload-text');
const fileInput = document.querySelector('.file-input');
const loadingOverlay = document.getElementById("loadingOverlay")
const cardActionBtns = document.querySelectorAll('.card-action-btn');
const cards = document.querySelectorAll('.card');
const uploadedFilesContainer = document.getElementById('uploadedFilesContainer');

cards.forEach(card => card.classList.add('disabled'));

// Arrastrar encima
uploadBox.addEventListener('dragover', e => {
  e.preventDefault();
  uploadBox.classList.add('hover');
});

// Salir del área
uploadBox.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');
});

// Soltar archivo
uploadBox.addEventListener('drop', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');

  const files = e.dataTransfer.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  fileInput.files = files;
  mostrarArchivos(files);
});



// Manejar selección de archivo
fileInput.addEventListener('change', () => {
  const files = fileInput.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files.length && files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  if (files.length) {
    mostrarArchivos(files);
  } else {
    uploadText.textContent = "Ningún archivo válido";
    cards.forEach(card => card.classList.add('disabled'));
  }
});

// Resetear input de archivo

function resetFileInput() {
  fileInput.value = '';
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = "Ningún archivo seleccionado";
  cards.forEach(card => card.classList.add('disabled'));
}


// Mostrar archivos
function mostrarArchivos(files) {
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = `${files.length} archivo(s) cargado(s)`;
  cards.forEach(card => card.classList.remove('disabled'));

  [...files].forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
      <span title="${file.name}">${file.name} <small>(${file.type || 'desconocido'})</small></span>
      <button class="remove-btn" data-index="${index}">❌</button>
    `;
    uploadedFilesContainer.appendChild(fileDiv);
  });

  // Manejar eliminar archivo (esto borra todo porque input.files es readonly)
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fileInput.value = '';
      uploadedFilesContainer.innerHTML = '';
      uploadText.textContent = "Ningún archivo seleccionado";
      cards.forEach(card => card.classList.add('disabled'));
    });
  });
}


// Manejar clics en botones de acción de tarjetas

cardActionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Mostrar loader
    loadingOverlay.classList.add("show");

    // Obtener tipo desde el contenedor padre más cercano con clase "card"
    const card = btn.closest(".card");
    const type = card?.dataset.type;

    // Ocultar loader y mostrar notificación
    setTimeout(() => {
      loadingOverlay.classList.remove("show");

      if (type) {
        showSuccessMessage(type);
      } else {
        showInfoMessage("¡Proceso completado!");
      }
    }, 3000);
  });
});


// Mostrar mensajes de éxito o información

function showSuccessMessage(type) {
  const messages = {
    "verdadero-falso": "¡Preguntas de Verdadero/Falso generadas exitosamente!",
    resumen: "¡Resumen creado exitosamente!",
    "multiple-choice": "¡Examen de opción múltiple generado exitosamente!",
  };

  showNotification(messages[type] || "¡Proceso exitoso!", "success");
}

function showInfoMessage(message) {
  showNotification(message, "info");
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icon = type === "success" ? "✅" : "ℹ️";
  const bgColor =
    type === "success"
      ? "linear-gradient(135deg, #00b894, #00a085)"
      : "linear-gradient(135deg, #0984e3, #74b9ff)";

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">${message}</div>
    </div>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 4000);
}
