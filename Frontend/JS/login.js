// Alternancia entre Iniciar Sesión y Registrarse
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');

const nameGroup = document.getElementById('name-group');
const roleGroup = document.getElementById('role-group');
const educationGroup = document.getElementById('education-group');
const loginExtra = document.getElementById('login-extra');

const authForm = document.getElementById('auth-form');

function showLogin() {
  loginToggle.classList.add('active');
  registerToggle.classList.remove('active');
  formTitle.textContent = 'Iniciar Sesión';
  submitBtn.textContent = 'Entrar';
  nameGroup.classList.add('hidden');
  roleGroup.classList.add('hidden');
  educationGroup.classList.add('hidden');
  loginExtra.style.display = '';
}

function showRegister() {
  loginToggle.classList.remove('active');
  registerToggle.classList.add('active');
  formTitle.textContent = 'Registrarse';
  submitBtn.textContent = 'Registrarse';
  nameGroup.classList.remove('hidden');
  roleGroup.classList.remove('hidden');
  educationGroup.classList.remove('hidden');
  loginExtra.style.display = 'none';
}

loginToggle.addEventListener('click', showLogin);
registerToggle.addEventListener('click', showRegister);

// Por defecto, mostrar login
showLogin();

authForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  // Detectar si estamos en modo registro o login
  const isRegister = registerToggle.classList.contains('active');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (isRegister) {
    // Registro
    const name = document.getElementById('name').value.trim();
    const role = document.getElementById('role').value;
    const education_level = document.getElementById('education_level').value;

    if (!name || !email || !password || !role) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    try {
      const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, education_level })
      });
      const data = await response.json();
      if (response.ok) {
        alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
        showLogin();
        authForm.reset();
      } else {
        alert(data.error || 'Error al registrar usuario');
      }
    } catch (err) {
      alert('Error de red o del servidor');
    }
  } else {
    // Login
    try {
      const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        // Guardar usuario en localStorage
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.EMAIL, email);
        localStorage.setItem(CONFIG.STORAGE_KEYS.PASSWORD, password);
        // Redirigir al home
        redirectToHome();
      } else {
        alert(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      alert('Error de red o del servidor');
    }
  }
}); 