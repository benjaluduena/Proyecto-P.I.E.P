let isDropdownOpen = false;

// Función para actualizar el menú activo
function actualizarMenuActivo(seccion) {
  // Remover clase activa de todos los elementos del menú
  document.querySelectorAll('.btn-sidebar-menu').forEach(item => {
    item.classList.remove('active');
  });
  
  // Agregar clase activa al elemento correspondiente
  if (seccion === 'home') {
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.classList.add('active');
    }
  } else {
    // Para otras secciones, buscar el botón que tenga el onclick correspondiente
    const activeButton = document.querySelector(`[onclick*="cargarSeccion('${seccion}')"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }
}

// Carga inicial
function cargarSeccion(nombre) {
  console.log(`Cargando sección: ${nombre}`);
  
  const contenedor = document.getElementById('contenido');
  if (!contenedor) {
    console.error('Contenedor de contenido no encontrado');
    return;
  }

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

      // Actualizar clases activas del menú
      actualizarMenuActivo(nombre);

      // Carga el script después de insertar el HTML
      const script = document.createElement('script');
      script.src = `/JS/${nombre}.js`;
      script.type = 'text/javascript';
      script.defer = true;
      
      // Manejar errores del script
      script.onerror = () => {
        console.warn(`Script ${nombre}.js no encontrado, continuando sin él`);
      };
      
      document.body.appendChild(script);

      // Reasignar logout por si la sección cambia el DOM
      asignarLogout();
      
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
    });
}

// Carga inicial
window.onload = () => {
  console.log('Página cargada, iniciando aplicación...');
  cargarSeccion('home');
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

  // Event listeners para los botones del menú
  const homeBtn = document.getElementById('homeBtn');
  const classroomBtn = document.getElementById('classroomBtn');
  
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Botón Home clickeado');
      cargarSeccion('home');
    });
  }
  
  if (classroomBtn) {
    console.log('🔧 Configurando event listener para botón Classroom...');
    classroomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Botón de Classroom clickeado - ejecutando openClassroomPage');
      if (typeof window.openClassroomPage === 'function') {
        console.log('✅ Función openClassroomPage encontrada, ejecutando...');
        window.openClassroomPage();
      } else {
        console.error('❌ Función openClassroomPage no está disponible');
      }
    });
    console.log('✅ Event listener del botón Classroom configurado correctamente');
  } else {
    console.error('❌ Botón classroomBtn no encontrado en el DOM');
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
  console.log('=== INICIANDO VERIFICACIÓN DE CLASSROOM ===');
  
  try {
    // Esperar a que Supabase esté disponible
    let supabaseClient;
    if (typeof window.waitForSupabase === 'function') {
      console.log('Esperando inicialización de Supabase...');
      supabaseClient = await window.waitForSupabase();
    } else if (typeof supabase !== 'undefined') {
      supabaseClient = supabase;
    } else {
      console.error('Supabase no está disponible');
      alert('Error: Sistema de autenticación no disponible');
      return;
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('No hay usuario autenticado, redirigiendo a login');
      window.location.href = '/login.html';
      return;
    }

    console.log('✅ Usuario autenticado:', user.email);
    console.log('🔑 ID del usuario:', user.id);

    // Verificar el rol del usuario
    console.log('🔍 Consultando perfil en la tabla profiles...');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('📊 Respuesta de la consulta:');
    console.log('- Data:', profile);
    console.log('- Error:', profileError);

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError);
      alert('Error al obtener el perfil del usuario. Por favor, asegúrate de tener un perfil creado.');
      return;
    }

    if (!profile) {
      console.error('❌ Perfil no encontrado para el usuario:', user.id);
      alert('Perfil no encontrado. Por favor, contacta al administrador.');
      return;
    }

    console.log('✅ Perfil encontrado:', profile);
    console.log('👤 Rol del usuario:', profile.role);

    if (profile && profile.role === 'docente') {
      console.log('🎓 Redirigiendo a classroom-teacher.html');
      window.location.href = '/classroom-teacher.html';
    } else if (profile && profile.role === 'estudiante') {
      console.log('📚 Redirigiendo a classroom-student.html');
      window.location.href = '/classroom-student.html';
    } else {
      console.error('❌ Rol no válido:', profile?.role);
      alert('Rol de usuario no válido. Por favor, contacta al administrador para asignar tu rol.');
    }
  } catch (error) {
    console.error('💥 Error verificando rol:', error);
    alert('Error al verificar el rol del usuario');
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
  // Busca el botón por el icono de logout
  const botones = document.querySelectorAll('.sidebar-footer .btn-sidebar-menu');
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


