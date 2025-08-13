let isDropdownOpen = false;
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

// Función para inicializar los event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Dropdown de perfil
  const userProfile = document.getElementById("userProfile");
  const profileDropdown = document.getElementById("profileDropdown");
  const btnAjustes = document.getElementById("btnAjustes");
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");

  if (userProfile && profileDropdown) {
    userProfile.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener("click", (e) => {
      if (!userProfile.contains(e.target)) {
        closeDropdown();
      }
    });

    profileDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (btnAjustes) {
    btnAjustes.addEventListener("click", () => {
      closeDropdown();
      window.location.href = "/perfil.html";
    });
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", logout);
  }

  // Botón Cambiar plan
  const btnCambiarPlan = document.getElementById('btnCambiarPlan');
  if (btnCambiarPlan) {
    btnCambiarPlan.addEventListener('click', async () => {
      try {
        // Ajusta el monto al mínimo permitido por tu cuenta/región en MP
        await PIEP.startSubscription({ amount: 1500, currency: 'ARS' });
      } catch (e) {
        alert('No se pudo iniciar el cambio de plan. Intenta de nuevo.');
      }
    });
  }

  // Rellenar información del usuario en el sidebar
  populateUserInfo();

  // Mostrar título completo solo si hay truncado
  const up = document.getElementById('userProfile');
  if (up) {
    up.addEventListener('mouseenter', updateUserProfileTitles);
    up.addEventListener('mousemove', updateUserProfileTitles);
  }
  window.addEventListener('resize', updateUserProfileTitles);
});

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

// Ruta por defecto para el avatar
const DEFAULT_AVATAR = '/Assets/Imagenes/usuario-sin-foto.png';

function setAvatarImage(imgEl, url) {
  if (!imgEl) return;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_AVATAR;
  };
  imgEl.src = url || DEFAULT_AVATAR;
}

// Obtiene el usuario guardado en localStorage o desde Supabase
function getStoredUser() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getBestDisplayName(user) {
  if (!user) return 'Usuario';
  const metaName = user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name);
  const directName = user.name;
  const fromEmail = user.email ? user.email.split('@')[0] : null;
  return directName || metaName || fromEmail || 'Usuario';
}

function getBestAvatarUrl(user) {
  if (!user) return null;
  // Priorizar campos comunes de proveedores (Google) y metadata personalizada
  return (
    user.avatar_url ||
    (user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture)) ||
    null
  );
}

async function populateUserInfo() {
  const nameEl = document.querySelector('.user-info .user-name');
  const emailEl = document.querySelector('.user-info .user-email');
  const avatarImg = document.querySelector('#userAvatar img');

  if (!nameEl || !emailEl) return;

  // Establecer avatar por defecto inicialmente
  setAvatarImage(avatarImg, null);

  // Intentar con el usuario guardado
  let user = getStoredUser();

  // Si no existe aún, intentar obtenerlo desde Supabase
  if (!user && window.supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        user = session.user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
    } catch (_) {
      // Ignorar errores silenciosamente
    }
  }

  if (!user) return;

  nameEl.textContent = getBestDisplayName(user);
  if (user.email) {
    emailEl.textContent = user.email;
  }

  const avatarUrl = getBestAvatarUrl(user);
  setAvatarImage(avatarImg, avatarUrl);

  // Actualizar títulos por si hay truncado
  updateUserProfileTitles();
}

// Actualizar UI si cambia el estado de autenticación
if (window.supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      } catch (_) {}
      populateUserInfo();
    }
  });
}

function isTruncated(element) {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth;
}

function updateUserProfileTitles() {
  const nameEl = document.querySelector('.user-info .user-name');
  const emailEl = document.querySelector('.user-info .user-email');
  if (nameEl) {
    if (isTruncated(nameEl)) {
      nameEl.title = nameEl.textContent || '';
    } else {
      nameEl.removeAttribute('title');
    }
  }
  if (emailEl) {
    if (isTruncated(emailEl)) {
      emailEl.title = emailEl.textContent || '';
    } else {
      emailEl.removeAttribute('title');
    }
  }
}
