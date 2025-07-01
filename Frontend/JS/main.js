// Carga inicial
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
  window.location.href = 'perfil.html';
}

// Función para cerrar sesión
function logout() {
  const confirmLogout = confirm("¿Estás seguro de que quieres cerrar sesión?")
  if (confirmLogout) {
    alert("Cerrando sesión...")
    closeDropdown()
    // Aquí puedes agregar la lógica para cerrar sesión
    // window.location.href = 'login.html';
  }
}



// Carga inicial
window.onload = () => cargarSeccion('home');

