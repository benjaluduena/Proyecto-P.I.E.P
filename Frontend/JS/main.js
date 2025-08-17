let isDropdownOpen = false;
let currentSection = 'home';
let navigationHistory = [];

// Carga inicial
function cargarSeccion(nombre) {
  // Validar nombre de sección
  if (!nombre || typeof nombre !== 'string') {
    console.error('Nombre de sección inválido:', nombre);
    return;
  }

  // Limpiar overlays/modales flotantes anteriores
  try { 
    document.querySelectorAll('.global-overlay, .quick-task-form, .quick-task-menu').forEach(el => el.remove()); 
  } catch (_) {}

  // Agregar a historial de navegación
  if (currentSection !== nombre) {
    navigationHistory.push(currentSection);
    currentSection = nombre;
  }

  // Mostrar indicador de carga
  showLoadingIndicator();

  fetch(`Pages/${nombre}.html`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.text();
    })
    .then(html => {
      const contenedor = document.getElementById('contenido');
      if (!contenedor) {
        throw new Error('Contenedor de contenido no encontrado');
      }

      contenedor.innerHTML = html;

      // Evitar duplicar el modal del calendario si ya existe en body
      try {
        const existingModal = document.getElementById('calendarModal');
        const injectedModal = contenedor.querySelector && contenedor.querySelector('#calendarModal');
        if (existingModal && injectedModal) {
          injectedModal.remove();
        }
      } catch (_) {}

      // Carga el script después de insertar el HTML
      // Elimina scripts de sección previos para evitar duplicados
      try {
        document.querySelectorAll('script[data-section-script="1"]').forEach(s => {
          const src = s.getAttribute('src') || '';
          if (!src.endsWith('/JS/home.js')) {
            s.remove();
          }
        });
      } catch (_) {}

      const script = document.createElement('script');
      script.src = `/JS/${nombre}.js`;
      script.type = 'text/javascript';
      script.defer = true;
      script.setAttribute('data-section-script', '1');
      
      // Manejar errores de carga de script
      script.onerror = () => {
        console.error(`Error al cargar el script: /JS/${nombre}.js`);
        showErrorMessage(`Error al cargar la funcionalidad de ${nombre}`);
      };

      document.body.appendChild(script);

      // Reasignar logout por si la sección cambia el DOM
      asignarLogout();
      // Reasignar navegación del sidebar
      bindSidebarNav();

      // Inicializar la sección si expone un init global
      // Esperar a que cargue el script y luego invocar
      script.onload = () => {
        const initName = nombre === 'plans' ? '__initPlans' : (nombre === 'home' ? '__initHome' : null);
        try {
          if (initName && typeof window[initName] === 'function') {
            window[initName]();
          }
        } catch(_) {}
        
        // Ocultar indicador de carga
        hideLoadingIndicator();
        
        // Actualizar estado activo del menú
        updateActiveMenuState(nombre);
      };
    })
    .catch(err => {
      console.error('Error al cargar sección:', err);
      hideLoadingIndicator();
      
      const contenedor = document.getElementById('contenido');
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="error-container">
            <h2>Error al cargar ${nombre}</h2>
            <p>${err.message}</p>
            <button onclick="cargarSeccion('home')" class="btn-small">Volver al inicio</button>
            <button onclick="location.reload()" class="btn-small btn-ghost">Recargar página</button>
          </div>
        `;
      }
    });
}

// Función para navegar hacia atrás
function goBack() {
  if (navigationHistory.length > 0) {
    const previousSection = navigationHistory.pop();
    cargarSeccion(previousSection);
  } else {
    cargarSeccion('home');
  }
}

// Función para mostrar indicador de carga
function showLoadingIndicator() {
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'global-loader';
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <p>Cargando...</p>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

// Función para ocultar indicador de carga
function hideLoadingIndicator() {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.style.display = 'none';
  }
}

// Función para mostrar mensaje de error
function showErrorMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <div class="error-content">
      <div class="error-icon">❌</div>
      <div class="error-text">${message}</div>
      <button onclick="this.parentElement.parentElement.remove()" class="error-close">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 5000);
}

// Función para mostrar mensaje de éxito
function showSuccessMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'success-notification';
  notification.innerHTML = `
    <div class="success-content">
      <div class="success-icon">✅</div>
      <div class="success-text">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 3000);
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
    btnCerrarSesion.addEventListener('click', logout);
  }

  // Enlazar Planes de estudio en el sidebar si existe
  const btnPlanes = document.getElementById('btnPlanesEstudio');
  if (btnPlanes) {
    btnPlanes.addEventListener('click', () => cargarSeccion('plans'));
  }

  // Enlazar navegación principal del sidebar
  bindSidebarNav();

  // Rellenar información del usuario en el sidebar
  populateUserInfo();

  // Mostrar título completo solo si hay truncado
  const up = document.getElementById('userProfile');
  if (up) {
    up.addEventListener('mouseenter', updateUserProfileTitles);
    up.addEventListener('mousemove', updateUserProfileTitles);
  }
  window.addEventListener('resize', updateUserProfileTitles);

  // Agregar botón de navegación hacia atrás
  addBackButton();
});

// Función para agregar botón de navegación hacia atrás
function addBackButton() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && navigationHistory.length > 0) {
    let backBtn = document.getElementById('backButton');
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.id = 'backButton';
      backBtn.className = 'menu-item back-button';
      backBtn.innerHTML = `
        <span class="sidebar-ico">
          <svg>
            <use href="/Assets/sprite.svg#icon-arrow-left"></use>
          </svg>
        </span>
        Volver
      `;
      backBtn.addEventListener('click', goBack);
      
      // Insertar después del logo
      const logoContainer = document.querySelector('.logo-container');
      if (logoContainer) {
        logoContainer.parentNode.insertBefore(backBtn, logoContainer.nextSibling);
      }
    }
    
    // Mostrar/ocultar según historial
    backBtn.style.display = navigationHistory.length > 0 ? 'flex' : 'none';
  }
}

function bindSidebarNav() {
  const items = document.querySelectorAll('.menu .menu-item');
  items.forEach(btn => {
    if (btn.dataset.boundNav === '1') return;
    const use = btn.querySelector('use');
    const href = use ? String(use.getAttribute('href') || '') : '';
    btn.onclick = null;
    if (btn.id === 'btnPlanesEstudio') {
      btn.addEventListener('click', () => {
        setActiveMenu(btn);
        cargarSeccion('plans');
      });
    } else if (href.includes('icon-home')) {
      btn.addEventListener('click', () => {
        setActiveMenu(btn);
        cargarSeccion('home');
      });
    } else if (href.includes('icon-calendar')) {
      btn.addEventListener('click', () => {
        setActiveMenu(btn);
        openCalendarWithEnsure();
      });
    } else if (href.includes('icon-history')) {
      btn.addEventListener('click', () => {
        setActiveMenu(btn);
        showHistorySection();
      });
    } else if (href.includes('icon-help')) {
      btn.addEventListener('click', () => {
        setActiveMenu(btn);
        showHelpSection();
      });
    }
    btn.dataset.boundNav = '1';
  });
}

// Función para mostrar sección de historial
function showHistorySection() {
  showInfoMessage('Funcionalidad de historial en desarrollo');
}

// Función para mostrar sección de ayuda
function showHelpSection() {
  showInfoMessage('Funcionalidad de ayuda en desarrollo');
}

// Función para mostrar mensaje informativo
function showInfoMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'info-notification';
  notification.innerHTML = `
    <div class="info-content">
      <div class="info-icon">ℹ️</div>
      <div class="info-text">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 4000);
}

function setActiveMenu(activeBtn) {
  document.querySelectorAll('.menu .menu-item').forEach(el => el.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}

// Función para actualizar el estado activo del menú
function updateActiveMenuState(sectionName) {
  const menuItems = document.querySelectorAll('.menu .menu-item');
  menuItems.forEach(item => {
    item.classList.remove('active');
    
    // Determinar qué botón debe estar activo basado en la sección
    const use = item.querySelector('use');
    const href = use ? String(use.getAttribute('href') || '') : '';
    
    if (sectionName === 'home' && href.includes('icon-home')) {
      item.classList.add('active');
    } else if (sectionName === 'plans' && item.id === 'btnPlanesEstudio') {
      item.classList.add('active');
    } else if (sectionName === 'calendar' && href.includes('icon-calendar')) {
      item.classList.add('active');
    }
  });
}

function openCalendarWithEnsure() {
  if (typeof openCalendar === 'function') {
    // Asegurar z-index correcto para permitir interacción del modal sobre cualquier overlay previo
    const modal = document.getElementById('calendarModal');
    if (modal) {
      modal.style.zIndex = '5000';
      // Mover el modal al body para evitar contextos de apilamiento que bloqueen interacción
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
    }
    // Limpiar overlays/menús flotantes que puedan interferir
    try {
      document.querySelectorAll('.global-overlay, .quick-task-form, .quick-task-menu').forEach(el => el.remove());
    } catch (_) {}
    openCalendar();
    return;
  }
  cargarSeccion('home');
  let tries = 0;
  const maxTries = 15;
  const iv = setInterval(() => {
    tries++;
    if (typeof openCalendar === 'function') {
      clearInterval(iv);
      const modal = document.getElementById('calendarModal');
      if (modal) {
        modal.style.zIndex = '5000';
        if (modal.parentElement !== document.body) {
          document.body.appendChild(modal);
        }
      }
      try {
        document.querySelectorAll('.global-overlay, .quick-task-form, .quick-task-menu').forEach(el => el.remove());
      } catch (_) {}
      openCalendar();
    } else if (tries >= maxTries) {
      clearInterval(iv);
      showErrorMessage('Error al abrir el calendario');
    }
  }, 200);
}


// Función de logout mejorada
async function logout() {
  console.log('Cerrando sesión...');
  
  try {
    // Mostrar confirmación
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }
    
    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión en Supabase:', error);
    }
    
    // Limpiar localStorage
    clearSession();
    
    // Limpiar historial de navegación
    navigationHistory = [];
    currentSection = 'home';
    
    showSuccessMessage('Sesión cerrada correctamente');
    
    // Redirigir después de un breve delay
    setTimeout(() => {
      redirectToLogin();
    }, 1000);
    
  } catch (error) {
    console.error('Error en logout:', error);
    clearSession();
    redirectToLogin();
  }
}

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

// Carga inicial
window.onload = () => cargarSeccion('home');
