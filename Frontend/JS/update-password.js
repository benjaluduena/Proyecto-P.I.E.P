// Manejo de restablecimiento de contraseña tras el enlace de Supabase
(function () {
  const form = document.getElementById('update-password-form');
  const newPassEl = document.getElementById('new_password');
  const confirmEl = document.getElementById('confirm_password');

  async function ensureSessionFromHash() {
    // Supabase procesa el hash con onAuthStateChange. Forzamos una lectura de sesión por si no llegó aún
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      for (let i = 0; i < 10 && !session; i++) {
        await new Promise(r => setTimeout(r, 200));
        const res = await supabase.auth.getSession();
        session = res.data.session;
      }
    }
    return session;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = newPassEl.value;
    const confirm = confirmEl.value;
    if (!pass || pass.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (pass !== confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }
    try {
      // Asegurar que la sesión del tipo recovery esté presente
      await ensureSessionFromHash();
      const { data, error } = await supabase.auth.updateUser({ password: pass });
      if (error) {
        alert(error.message || 'No se pudo actualizar la contraseña');
        return;
      }
      alert('Contraseña actualizada correctamente');
      redirectToLogin();
    } catch (err) {
      console.error('Error actualizando contraseña:', err);
      alert('Error de red o del servidor');
    }
  });
})();


