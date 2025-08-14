// Funciones para manejar la interactividad
document.addEventListener('DOMContentLoaded', function () {
  // Poblar datos del usuario
  populateProfileFromUser();
  loadSubscriptionInfo();

  document.getElementById('btnBack').addEventListener('click', function () {
    window.location.href = 'index.html';
  });

  document.getElementById('btnAvatarUpload').addEventListener('click', changeAvatar);
  document.getElementById('btnEditProfile').addEventListener('click', openEditModal);

  document.getElementById('toggleEmail').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('toggleReminder').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('togglePublic').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('toggleDark').addEventListener('click', function () { toggleSetting(this); });

  document.getElementById('btnSaveChanges').addEventListener('click', saveChanges);
  document.getElementById('btnChangePassword').addEventListener('click', changePassword);
  document.getElementById('btnDeleteAccount').addEventListener('click', deleteAccount);

  document.getElementById('btnCloseEditModal').addEventListener('click', closeEditModal);
  document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);
  document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
  
  document.getElementById('btnManageSubscriptionFromProfile').addEventListener('click', () => {
    window.location.href = '/Pages/suscripciones.html';
  });
});

function toggleSetting(element) {
  element.classList.toggle('active');
}

function openEditModal() {
  document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function saveProfile() {
  // Obtener valores del formulario
  const name = document.getElementById('editName').value;
  const email = document.getElementById('editEmail').value;
  const role = document.getElementById('editRole').value;
  const education = document.getElementById('editEducation').value;

  // Actualizar la información mostrada
  document.getElementById('userName').textContent = name.split(' ')[0] + ' ' + name.split(' ')[1];
  document.getElementById('userEmail').textContent = email;
  document.getElementById('displayName').textContent = name;
  document.getElementById('displayEmail').textContent = email;
  document.getElementById('displayRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  document.getElementById('displayEducation').textContent = education.charAt(0).toUpperCase() + education.slice(1);
  document.getElementById('userRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);

  // Actualizar iniciales del avatar
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  document.getElementById('avatarInitials').textContent = initials;

  closeEditModal();
  alert('Perfil actualizado correctamente');
}

function changeAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const avatarImg = document.getElementById('avatarImg');
        const avatarInitials = document.getElementById('avatarInitials');
        avatarImg.src = e.target.result;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function saveChanges() {
  alert('Cambios guardados correctamente');
}

function changePassword() {
  alert('Redirigiendo a cambio de contraseña...');
}

function deleteAccount() {
  if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
    alert('Cuenta eliminada');
  }
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function (event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// Avatar por defecto
const DEFAULT_AVATAR = '/Assets/Imagenes/usuario-sin-foto.png';

function setAvatarImage(imgEl, url) {
  if (!imgEl) return;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_AVATAR;
  };
  imgEl.src = url || DEFAULT_AVATAR;
}

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
  return (
    user.avatar_url ||
    (user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture)) ||
    null
  );
}

function getBestRole(user) {
  if (!user) return 'Estudiante';
  return (user.role || (user.user_metadata && user.user_metadata.role) || 'estudiante')
    .toString()
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
}

function getBestEducation(user) {
  if (!user) return 'Universitario';
  const value = (user.education_level || (user.user_metadata && user.user_metadata.education_level) || 'universitario').toString();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function populateProfileFromUser() {
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const roleEl = document.getElementById('userRole');
  const displayNameEl = document.getElementById('displayName');
  const displayEmailEl = document.getElementById('displayEmail');
  const displayRoleEl = document.getElementById('displayRole');
  const displayEducationEl = document.getElementById('displayEducation');
  const avatarImg = document.getElementById('avatarImg');
  const avatarInitials = document.getElementById('avatarInitials');

  // avatar default
  setAvatarImage(avatarImg, null);

  let user = getStoredUser();

  if (!user && window.supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        user = session.user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
    } catch (_) {}
  }

  if (!user) return;

  const fullName = getBestDisplayName(user);
  const email = user.email || '';
  const role = getBestRole(user);
  const education = getBestEducation(user);

  if (nameEl) nameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = email;
  if (roleEl) roleEl.textContent = role;
  if (displayNameEl) displayNameEl.textContent = fullName;
  if (displayEmailEl) displayEmailEl.textContent = email;
  if (displayRoleEl) displayRoleEl.textContent = role;
  if (displayEducationEl) displayEducationEl.textContent = education;

  // Avatar imagen o iniciales
  const url = getBestAvatarUrl(user);
  if (url) {
    avatarImg.style.display = 'block';
    avatarInitials.style.display = 'none';
    setAvatarImage(avatarImg, url);
  } else {
    avatarImg.style.display = 'none';
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    avatarInitials.textContent = initials;
    avatarInitials.style.display = 'block';
  }
}

// Actualizar si cambia el estado de autenticación
if (window.supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      } catch (_) {}
      populateProfileFromUser();
    }
  });
}

// Funciones para suscripciones
async function loadSubscriptionInfo() {
  try {
    const response = await apiCall('/api/payments/subscription/status');
    if (response && response.ok) {
      const data = await response.json();
      updateSubscriptionInfoUI(data);
    }
  } catch (error) {
    console.error('Error al cargar información de suscripción:', error);
  }
}

function updateSubscriptionInfoUI(data) {
  const statusElement = document.getElementById('subscriptionStatusValue');
  const nextPaymentElement = document.getElementById('nextPaymentValue');
  
  if (data.status === 'authorized') {
    statusElement.textContent = 'Activa';
    statusElement.className = 'setting-value status-active';
    nextPaymentElement.textContent = data.next_payment_date 
      ? new Date(data.next_payment_date).toLocaleDateString() 
      : 'No disponible';
  } else {
    statusElement.textContent = 'Inactiva';
    statusElement.className = 'setting-value status-inactive';
    nextPaymentElement.textContent = '--';
  }
}