// Referencias a elementos del DOM
    const loginToggle = document.getElementById('login-toggle');
    const registerToggle = document.getElementById('register-toggle');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const authForm = document.getElementById('auth-form');
    const loginExtra = document.getElementById('login-extra');
    
    // Campos de registro
    const nameGroup = document.getElementById('name-group');
    const roleGroup = document.getElementById('role-group');
    const educationGroup = document.getElementById('education-group');
    const roleSelect = document.getElementById('role');
    const nameInput = document.getElementById('name');
    
    // Estado actual del formulario
    let isLoginMode = true;
    
    // Función para cambiar a modo login
    function switchToLogin() {
      isLoginMode = true;
      
      // Actualizar botones de toggle
      loginToggle.classList.add('active');
      registerToggle.classList.remove('active');
      
      // Actualizar título y botón
      formTitle.textContent = 'Iniciar Sesión';
      submitBtn.textContent = 'Entrar';
      
      // Ocultar campos de registro
      nameGroup.classList.add('hidden');
      roleGroup.classList.add('hidden');
      educationGroup.classList.add('hidden');
      
      // Mostrar enlace de contraseña olvidada
      loginExtra.style.display = 'block';
      
      // Limpiar campos de registro
      nameInput.value = '';
      roleSelect.value = '';
      document.getElementById('education_level').value = '';
      
      // Remover required de campos de registro
      nameInput.removeAttribute('required');
      roleSelect.removeAttribute('required');
    }
    
    // Función para cambiar a modo registro
    function switchToRegister() {
      isLoginMode = false;
      
      // Actualizar botones de toggle
      loginToggle.classList.remove('active');
      registerToggle.classList.add('active');
      
      // Actualizar título y botón
      formTitle.textContent = 'Registrarse';
      submitBtn.textContent = 'Crear Cuenta';
      
      // Mostrar campos de registro
      nameGroup.classList.remove('hidden');
      roleGroup.classList.remove('hidden');
      
      // Ocultar enlace de contraseña olvidada
      loginExtra.style.display = 'none';
      
      // Agregar required a campos de registro
      nameInput.setAttribute('required', '');
      roleSelect.setAttribute('required', '');
    }
    
    // Función para manejar el cambio de rol
    function handleRoleChange() {
      const selectedRole = roleSelect.value;
      
      if (selectedRole === 'estudiante') {
        educationGroup.classList.remove('hidden');
        document.getElementById('education_level').setAttribute('required', '');
      } else {
        educationGroup.classList.add('hidden');
        document.getElementById('education_level').removeAttribute('required');
        document.getElementById('education_level').value = '';
      }
    }
    
    // Event listeners
    loginToggle.addEventListener('click', switchToLogin);
    registerToggle.addEventListener('click', switchToRegister);
    roleSelect.addEventListener('change', handleRoleChange);
    
    // Manejar envío del formulario
    authForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(authForm);
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      if (isLoginMode) {
        // Lógica de login
        console.log('Intentando iniciar sesión con:', {
          email: email,
          password: password
        });
        alert('Función de login - Datos enviados a consola');
      } else {
        // Lógica de registro
        const name = document.getElementById('name').value;
        const role = document.getElementById('role').value;
        const educationLevel = document.getElementById('education_level').value;
        
        const userData = {
          name: name,
          email: email,
          password: password,
          role: role
        };
        
        // Solo agregar education_level si el rol es estudiante
        if (role === 'estudiante') {
          userData.education_level = educationLevel;
        }
        
        console.log('Intentando registrar usuario con:', userData);
        alert('Función de registro - Datos enviados a consola');
      }
    });
    
    // Inicializar en modo login
    switchToLogin();