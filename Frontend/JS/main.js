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

// Variables globales
let isDropdownOpen = false

// Función para inicializar los event listeners
document.addEventListener("DOMContentLoaded", () => {
  const userProfile = document.getElementById("userProfile")
  const profileDropdown = document.getElementById("profileDropdown")

  // Event listener para el clic en el perfil
  userProfile.addEventListener("click", (e) => {
    e.stopPropagation()
    toggleDropdown()
  })

  // Event listener para cerrar el dropdown al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!userProfile.contains(e.target)) {
      closeDropdown()
    }
  })

  // Prevenir que el dropdown se cierre al hacer clic dentro de él
  profileDropdown.addEventListener("click", (e) => {
    e.stopPropagation()
  })

  // Asigna el evento al botón de perfil
  const btnPerfil = document.getElementById("btnAjustes");
  if (btnPerfil) {
    btnPerfil.addEventListener("click", openSettings);
  }
})

// Función para alternar el dropdown
function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown")

  if (isDropdownOpen) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

// Función para abrir el dropdown
function openDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  dropdown.classList.add("show")
  isDropdownOpen = true
}

// Función para cerrar el dropdown
function closeDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  dropdown.classList.remove("show")
  isDropdownOpen = false
}

// Función para abrir configuraciones
function openSettings() {
  alert("Abriendo configuraciones...")
  closeDropdown()
  window.location.href = '/perfil.html';
}


// Carga inicial
window.onload = () => cargarSeccion('home');

// Función de logout mejorada
async function logout() {
  console.log('Cerrando sesión...');
  
  try {
    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión en Supabase:', error);
    }
    
    // Limpiar localStorage
    clearSession();
    
    alert('Sesión cerrada correctamente');
    redirectToLogin();
  } catch (error) {
    console.error('Error en logout:', error);
    clearSession();
    redirectToLogin();
  }
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
