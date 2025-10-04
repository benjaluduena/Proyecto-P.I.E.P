// Sistema de autenticación demo para testing
// Este archivo crea una sesión temporal para poder probar el historial

function createDemoSession() {
  console.log('🔧 Creando sesión demo para testing...');
  
  // Crear datos de sesión demo
  const demoUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'demo@test.com',
    name: 'Usuario Demo',
    user_metadata: {
      name: 'Usuario Demo',
      avatar_url: null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const demoSession = {
    access_token: 'demo-token-for-testing-only',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'demo-refresh-token',
    user: demoUser
  };

  // Guardar en localStorage
  try {
    localStorage.setItem('session', JSON.stringify(demoSession));
    localStorage.setItem('user', JSON.stringify(demoUser));
    
    console.log('✅ Sesión demo creada exitosamente');
    console.log('Usuario demo:', demoUser);
    
    return { success: true, user: demoUser, session: demoSession };
  } catch (error) {
    console.error('❌ Error creando sesión demo:', error);
    return { success: false, error };
  }
}

function clearDemoSession() {
  localStorage.removeItem('session');
  localStorage.removeItem('user');
  console.log('🗑️ Sesión demo eliminada');
}

// Función para verificar si hay sesión activa
function checkSession() {
  try {
    const session = localStorage.getItem('session');
    const user = localStorage.getItem('user');
    
    if (session && user) {
      const sessionData = JSON.parse(session);
      const userData = JSON.parse(user);
      
      console.log('📱 Sesión encontrada:', {
        user: userData.email,
        expires_at: new Date(sessionData.expires_at * 1000).toLocaleString()
      });
      
      return { hasSession: true, user: userData, session: sessionData };
    } else {
      console.log('⚠️ No hay sesión activa');
      return { hasSession: false };
    }
  } catch (error) {
    console.error('❌ Error verificando sesión:', error);
    return { hasSession: false, error };
  }
}

// Exponer funciones globalmente
window.createDemoSession = createDemoSession;
window.clearDemoSession = clearDemoSession;
window.checkSession = checkSession;

// Auto-crear sesión demo si no existe (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  document.addEventListener('DOMContentLoaded', () => {
    const sessionCheck = checkSession();
    if (!sessionCheck.hasSession) {
      console.log('🔧 Auto-creando sesión demo para localhost...');
      createDemoSession();
    }
  });
}