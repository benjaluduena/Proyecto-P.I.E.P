// Funciones para manejar la interactividad
document.querySelector('.back-btn').addEventListener('click', function () {
  window.location.href = 'index.html';
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