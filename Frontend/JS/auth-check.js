// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  if (!isAuthenticated()) {
    redirectToLogin();
  }
}); 