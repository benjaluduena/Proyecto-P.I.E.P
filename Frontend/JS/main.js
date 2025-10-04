let isDropdownOpen = false;
// Función de carga de sección que delega al sistema modular
function cargarSeccion(nombre) {
  console.log(`cargarSeccion llamado con: ${nombre}`);
  
  // Si el sistema modular está disponible, usarlo
  if (window.app && window.app.loadSection) {
    console.log('Usando sistema modular para cargar sección');
    window.app.loadSection(nombre);
    return;
  }
  
  // Fallback al sistema legacy si el modular no está disponible
  console.log('Usando sistema legacy para cargar sección');
  loadSectionLegacy(nombre);
}

// Sistema legacy de carga (backup)
function loadSectionLegacy(nombre) {
  // Ocultar cualquier loading activo antes de comenzar
  if (window.app && window.app.uiModule) {
    window.app.uiModule.hideLoading();
  }
  
  // Limpiar recursos de la sección anterior
  if (window.cleanupHistorial && document.getElementById('historialContainer')) {
    console.log('Limpiando recursos de historial antes de cargar nueva sección');
    window.cleanupHistorial();
  }
  
  if (window.cleanupCambiarPlan && document.querySelector('.cambiar-plan-container')) {
    console.log('Limpiando recursos de cambiar plan antes de cargar nueva sección');
    window.cleanupCambiarPlan();
  }
  
  // Eliminar scripts anteriores para evitar duplicados
  const oldScripts = document.querySelectorAll('script[data-section]');
  oldScripts.forEach(script => {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  });

  // Eliminar cualquier script de la misma sección previamente insertado por otros sistemas
  const dupScripts = Array.from(document.querySelectorAll('script[src]')).filter(s => {
    const src = s.getAttribute('src') || '';
    return src.includes(`/JS/${nombre}.js`);
  });
  dupScripts.forEach(s => {
    if (s.parentNode) {
      s.parentNode.removeChild(s);
      console.log(`🗑️ Script duplicado eliminado (legacy): ${s.src}`);
    }
  });
  
  fetch(`Pages/${nombre}.html`)
    .then(res => res.text())
    .then(html => {
      const contenedor = document.getElementById('contenido');
      contenedor.innerHTML = html;

      // Carga el script después de insertar el HTML
      const script = document.createElement('script');
      script.src = `/JS/${nombre}.js`;
      script.type = 'text/javascript';
      script.defer = true;
      script.setAttribute('data-section', nombre);
      
      script.onload = function() {
        console.log(`Script ${nombre}.js cargado correctamente`);
      };
      script.onerror = function() {
        console.error(`Error al cargar el script ${nombre}.js`);
      };
      
      document.body.appendChild(script);

      // Reasignar logout por si la sección cambia el DOM
      asignarLogout();
      
      // Inicializaciones específicas por sección
      if (nombre === 'home' && window.initializeHomeIfNeeded) {
        console.log('Inicializando home después de cargar HTML...');
        setTimeout(() => {
          if (window.initializeHomeIfNeeded) {
            window.initializeHomeIfNeeded();
            console.log('Home inicializado correctamente');
          } else {
            console.error('Error: initializeHomeIfNeeded no está disponible');
          }
        }, 300);
      }
      
      if (nombre === 'historial' && window.initializeHistorial) {
        setTimeout(() => window.initializeHistorial(), 200);
      }
      
      if (nombre === 'cambiar-plan' && window.initializeCambiarPlan) {
        setTimeout(() => window.initializeCambiarPlan(), 200);
      }
      
      if (nombre === 'planes-estudio' && window.initializeStudyPlans) {
        setTimeout(() => {
          console.log('Inicializando planes de estudio...');
          window.initializeStudyPlans();
        }, 300);
      }
    })
    .catch(err => {
      console.error('Error al cargar sección:', err);
      document.getElementById('contenido').innerHTML = `<p>Error al cargar ${nombre}</p>`;
    });
}

// Carga inicial
window.onload = () => {
  console.log('Evento window.onload disparado');
  // Verificar que supabase esté disponible antes de cargar la sección home
  if (window.supabase) {
    console.log('Supabase disponible, cargando sección home');
    cargarSeccion('home');
  } else {
    console.error('Supabase no disponible, esperando...');
    // Esperar a que supabase esté disponible
    setTimeout(() => {
      if (window.supabase) {
        console.log('Supabase disponible después de espera, cargando sección home');
        cargarSeccion('home');
      } else {
        console.error('Supabase no disponible después de espera, cargando sección home de todos modos');
        cargarSeccion('home');
      }
    }, 500);
  }
};

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
  // Inicializar navegación móvil
  initializeMobileNavigation();
  
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
    // Ahora solo abre la sección de cambio de plan. La redirección a MercadoPago ocurre
    // únicamente cuando el usuario selecciona un plan diferente en la UI de cambiar-plan.
    btnCambiarPlan.addEventListener('click', handleCambiarPlan);
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
  // Buscar botón "Cambiar plan"
  const btnCambiarPlan = document.getElementById('btnCambiarPlan');
  if (btnCambiarPlan) {
    btnCambiarPlan.removeEventListener('click', handleCambiarPlan);
    btnCambiarPlan.addEventListener('click', handleCambiarPlan);
    console.log('Botón Cambiar plan listo');
  }
  
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

// Función para manejar clic en "Cambiar plan"
function handleCambiarPlan(e) {
  e.preventDefault();
  console.log('Cargando sección cambiar-plan...');
  cargarSeccion('cambiar-plan');
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

// Actualizar UI si cambia el estado de autenticación (solo para index.html)
async function setupAuthStateListenerForMain() {
  try {
    const supabase = await window.waitForSupabase();
    if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
            localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
            populateUserInfo();
          } catch (_) {}
        } else if (event === 'SIGNED_OUT') {
          clearSession();
          redirectToLogin();
        }
      });
    }
  } catch (error) {
    console.error('Error configurando listener de auth en main:', error);
  }
}

// Solo configurar el listener si estamos en index.html
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
  document.addEventListener('supabaseReady', setupAuthStateListenerForMain);
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

// Funciones para navegación móvil
function initializeMobileNavigation() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const mobileHeader = document.getElementById('mobileHeader');

  // Solo inicializar en dispositivos móviles
  if (!hamburgerBtn || !sidebar || !sidebarOverlay) return;

  // Mostrar/ocultar header móvil según el tamaño de pantalla
  function toggleMobileHeader() {
    if (window.innerWidth <= 768) {
      mobileHeader.style.display = 'flex';
    } else {
      mobileHeader.style.display = 'none';
    }
  }

  // Inicializar visibilidad del header móvil
  toggleMobileHeader();

  // Toggle del menú hamburguesa
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileSidebar();
  });

  // Cerrar sidebar al hacer clic en el overlay
  sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Cerrar sidebar al hacer clic en un enlace del menú
  const menuItems = sidebar.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      setTimeout(closeMobileSidebar, 300); // Delay para permitir la navegación
    });
  });

  // Cerrar sidebar al redimensionar la ventana a desktop
  window.addEventListener('resize', () => {
    toggleMobileHeader();
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
  });

  // Cerrar sidebar al hacer scroll (opcional)
  window.addEventListener('scroll', closeMobileSidebar);
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  if (sidebar.classList.contains('open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
  hamburgerBtn.classList.add('active');
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  hamburgerBtn.classList.remove('active');
  
  // Restaurar scroll del body
  document.body.style.overflow = '';
}
