
 const uploadBox = document.querySelector('.upload-box');
  const uploadText = document.querySelector('.upload-text');
  const fileInput = document.querySelector('.file-input');

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
    if (files.length) {
      fileInput.files = files;
      uploadText.textContent = `${files.length} archivo(s) cargado(s)`;
    } else {
      uploadText.textContent = "Ningún archivo válido";
    }
  });

  // También permitir hacer clic para elegir archivo
  uploadBox.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      uploadText.textContent = `${fileInput.files.length} archivo(s) cargado(s)`;
    }
  });
