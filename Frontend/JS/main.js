let isDropdownOpen = false;
// Función de carga de sección que delega al sistema modular
function cargarSeccion(nombre) {
<<<<<<< HEAD
  console.log(`Cargando sección: ${nombre}`);
  
  const contenedor = document.getElementById('contenido');
  if (!contenedor) {
    console.error('Contenedor de contenido no encontrado');
    return;
  }

=======
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
  
>>>>>>> origin/feat-plan-estudio
  fetch(`Pages/${nombre}.html`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text();
    })
    .then(html => {
      console.log(`HTML cargado para ${nombre}`);
      contenedor.innerHTML = html;

      // Carga el script después de insertar el HTML
      const script = document.createElement('script');
      script.src = `/JS/${nombre}.js`;
      script.type = 'text/javascript';
      script.defer = true;
<<<<<<< HEAD
      
      // Manejar errores del script
      script.onerror = () => {
        console.warn(`Script ${nombre}.js no encontrado, continuando sin él`);
=======
      script.setAttribute('data-section', nombre);
      
      script.onload = function() {
        console.log(`Script ${nombre}.js cargado correctamente`);
      };
      script.onerror = function() {
        console.error(`Error al cargar el script ${nombre}.js`);
>>>>>>> origin/feat-plan-estudio
      };
      
      document.body.appendChild(script);

      // Reasignar logout por si la sección cambia el DOM
      asignarLogout();
      
<<<<<<< HEAD
      // Volver a poblar información del usuario después de cargar la sección
      setTimeout(() => {
        populateUserInfo();
      }, 200);
    })
    .catch(err => {
      console.error(`Error cargando ${nombre}:`, err);
      contenedor.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3>Error al cargar ${nombre}</h3>
          <p>No se pudo cargar la sección solicitada.</p>
          <button onclick="cargarSeccion('home')" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Volver al inicio
          </button>
        </div>
      `;
=======
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
>>>>>>> origin/feat-plan-estudio
    });
}

// Carga inicial
window.onload = () => {
<<<<<<< HEAD
  console.log('Página cargada, iniciando aplicación...');
  cargarSeccion('home');
=======
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
>>>>>>> origin/feat-plan-estudio
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
  console.log('DOMContentLoaded ejecutado');
  
  // Verificar si Supabase está disponible
  if (typeof supabase === 'undefined') {
    console.error('Supabase no está disponible');
  } else {
    console.log('Supabase está disponible');
  }
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

<<<<<<< HEAD
  // Event listeners para los botones del menú
  const homeBtn = document.getElementById('homeBtn');
  const classroomBtn = document.getElementById('classroomBtn');
  
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Botón Home clickeado');
      cargarSeccion('home');
      
      // Actualizar clases activas
      document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
      homeBtn.classList.add('active');
    });
  }
  
  if (classroomBtn) {
    classroomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Botón de Classroom clickeado');
      if (typeof window.openClassroomPage === 'function') {
        window.openClassroomPage();
      } else {
        console.error('Función openClassroomPage no está disponible');
=======
  // Botón Cambiar plan
  const btnCambiarPlan = document.getElementById('btnCambiarPlan');
  if (btnCambiarPlan) {
    btnCambiarPlan.addEventListener('click', async () => {
      try {
        // Ajusta el monto al mínimo permitido por tu cuenta/región en MP
        await PIEP.startSubscription({ amount: 1500, currency: 'ARS' });
      } catch (e) {
        alert('No se pudo iniciar el cambio de plan. Intenta de nuevo.');
>>>>>>> origin/feat-plan-estudio
      }
    });
  }

  // Rellenar información del usuario en el sidebar
  // Ejecutar populateUserInfo después de un pequeño delay para asegurar que todo esté listo
  setTimeout(() => {
    populateUserInfo();
  }, 100);

  // Mostrar título completo solo si hay truncado
  const up = document.getElementById('userProfile');
  if (up) {
    up.addEventListener('mouseenter', updateUserProfileTitles);
    up.addEventListener('mousemove', updateUserProfileTitles);
  }
  window.addEventListener('resize', updateUserProfileTitles);
});

// Función para abrir la página de classroom según el rol del usuario
window.openClassroomPage = async function() {
  console.log('Función openClassroomPage ejecutada');
  
  try {
    // Verificar si Supabase está disponible
    if (typeof supabase === 'undefined') {
      console.error('Supabase no está disponible');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No hay usuario autenticado, redirigiendo a login');
      window.location.href = '/login.html';
      return;
    }

    console.log('Usuario autenticado:', user.email);

    // Verificar el rol del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Perfil del usuario:', profile);

    if (profile && profile.role === 'docente') {
      console.log('Redirigiendo a classroom de docente');
      window.location.href = '/classroom-teacher.html';
    } else if (profile && profile.role === 'estudiante') {
      console.log('Redirigiendo a classroom de estudiante');
      window.location.href = '/classroom-student.html';
    } else {
      console.log('Rol no válido:', profile?.role);
      console.error('Rol de usuario no válido');
    }
  } catch (error) {
    console.error('Error verificando rol:', error);
  }
};



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
  try {
    const nameEl = document.querySelector('.user-info .user-name');
    const emailEl = document.querySelector('.user-info .user-email');
    const avatarImg = document.querySelector('#userAvatar img');

    if (!nameEl || !emailEl) {
      console.log('Elementos de usuario no encontrados');
      return;
    }

    // Establecer avatar por defecto inicialmente
    setAvatarImage(avatarImg, null);

    // Intentar obtener la sesión actual de Supabase
    let user = null;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        user = session.user;
        // Guardar en localStorage
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, session.access_token);
      }
    } catch (error) {
      console.error('Error obteniendo sesión de Supabase:', error);
    }

    // Si no se pudo obtener de Supabase, intentar con localStorage
    if (!user) {
      user = getStoredUser();
    }

    if (!user) {
      console.log('No se pudo obtener información del usuario');
      // Establecer valores por defecto
      nameEl.textContent = 'Usuario';
      emailEl.textContent = 'usuario@email.com';
      return;
    }

    // Actualizar la información del usuario
    const displayName = getBestDisplayName(user);
    const userEmail = user.email || 'usuario@email.com';
    
    nameEl.textContent = displayName;
    emailEl.textContent = userEmail;

    const avatarUrl = getBestAvatarUrl(user);
    setAvatarImage(avatarImg, avatarUrl);

    // Actualizar títulos por si hay truncado
    updateUserProfileTitles();
    
    console.log('Información del usuario actualizada:', { displayName, userEmail });
  } catch (error) {
    console.error('Error en populateUserInfo:', error);
  }
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
