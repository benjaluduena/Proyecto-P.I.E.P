// Verificación de autenticación simple para páginas que no usan sistema modular
(function() {
  'use strict';
  
  // Solo ejecutar en páginas específicas que no tienen el sistema modular
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login');
  const isLandingPage = currentPath.includes('landing') || currentPath === '/';
  const isIndexPage = currentPath.includes('index.html') || currentPath.endsWith('/');
  
  // No ejecutar en páginas que ya tienen su propio sistema de auth
  if (isLoginPage || isLandingPage || isIndexPage) {
    console.log('SimpleAuthCheck: Saltando verificación en página especial');
    return;
  }
  
  // Solo para páginas que realmente necesitan verificación básica
  function quickAuthCheck() {
    try {
      const storedSession = localStorage.getItem('session');
      if (!storedSession) {
        console.log('SimpleAuthCheck: No hay sesión, redirigiendo a login');
        window.location.replace('/login.html');
        return;
      }
      
      const sessionData = JSON.parse(storedSession);
      const now = Math.floor(Date.now() / 1000);
      
      if (!sessionData.expires_at || sessionData.expires_at <= now) {
        console.log('SimpleAuthCheck: Sesión expirada, redirigiendo a login');
        localStorage.clear();
        window.location.replace('/login.html');
        return;
      }
      
      console.log('SimpleAuthCheck: Sesión válida');
    } catch (error) {
      console.error('SimpleAuthCheck: Error:', error);
      localStorage.clear();
      window.location.replace('/login.html');
    }
  }
  
  // Ejecutar verificación inmediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', quickAuthCheck);
  } else {
    quickAuthCheck();
  }
})();