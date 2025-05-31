function cargarSeccion(nombre) {
  fetch(`Pages/${nombre}.html`)
    .then(res => res.text())
    .then(html => {
      const contenedor = document.getElementById('contenido');
      contenedor.innerHTML = html;

      // Carga el script después de insertar el HTML
      const script = document.createElement('script');
      script.src = `/Frontend/JS/${nombre}.js`; // Asume un archivo con el mismo nombre
      script.type = 'text/javascript';
      script.defer = true;
      document.body.appendChild(script);
    })
    .catch(err => {
      document.getElementById('contenido').innerHTML = `<p>Error al cargar ${nombre}</p>`;
    });
}


// Carga inicial
window.onload = () => cargarSeccion('home');
