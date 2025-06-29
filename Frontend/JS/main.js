// Carga inicial
function cargarSeccion(nombre) {
  fetch(`Pages/${nombre}.html`)
    .then(res => res.text())
    .then(html => {
      const contenedor = document.getElementById('contenido');
      contenedor.innerHTML = html;

      // Carga el script después de insertar el HTML
      const script = document.createElement('script');
      script.src = `/JS/${nombre}.js`; // Corregida la ruta
      script.type = 'text/javascript';
      script.defer = true;
      document.body.appendChild(script);

      // Reasignar logout por si la sección cambia el DOM
      asignarLogout();
    })
    .catch(err => {
      document.getElementById('contenido').innerHTML = `<p>Error al cargar ${nombre}</p>`;
    });
}

// Carga inicial
window.onload = () => cargarSeccion('home');

// Función de logout mejorada
function logout() {
  console.log('Cerrando sesión...');
  clearSession();
  alert('Sesión cerrada correctamente');
  redirectToLogin();
}

// Asignar logout al botón 'Salir' de forma robusta
function asignarLogout() {
  // Busca el botón por el icono de logout
  const botones = document.querySelectorAll('.sidebar-footer .menu-item');
  for (let btn of botones) {
    const svg = btn.querySelector('use');
    if (svg && svg.getAttribute('href') && svg.getAttribute('href').includes('icon-logout')) {
      btn.removeEventListener('click', logout); // Evita duplicados
      btn.addEventListener('click', logout);
      console.log('Botón Salir listo');
      break;
    }
  }
}

// Ejecutar al cargar el DOM y tras cargar secciones
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', asignarLogout);
} else {
  asignarLogout();
}
