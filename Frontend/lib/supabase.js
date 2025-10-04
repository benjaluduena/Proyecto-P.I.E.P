// Configuración simple de Supabase
const SUPABASE_URL = 'https://fqmpmseabhtvahzdavej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE';

// Cliente simple de Supabase
const supabase = {
  auth: {
    signUp: async (credentials) => {
      try {
        console.log('Enviando registro a Supabase:', credentials);
        
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(credentials)
        });

        console.log('Respuesta del servidor:', response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = `Error ${response.status}: ${response.statusText}`;
          
          try {
            const errorData = await response.json();
            console.log('Datos del error:', errorData);
            
            if (errorData.error_description) {
              errorMessage = errorData.error_description;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.log('No se pudo parsear el error:', parseError);
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Registro exitoso:', data);
        return { data, error: null };
      } catch (error) {
        console.error('Error completo en signUp:', error);
        return { data: null, error };
      }
    },

    signInWithPassword: async (credentials) => {
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(credentials)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error_description || errorData.message || 'Error en el inicio de sesión');
        }

        const data = await response.json();
        
        // Guardar la sesión en localStorage
        if (data.access_token) {
          localStorage.setItem('supabase.auth.token', JSON.stringify(data));
          localStorage.setItem('session', JSON.stringify(data));
          
          // También guardar información del usuario si está disponible
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    signInWithOAuth: async (provider, options = {}) => {
      try {
        const redirectTo = options.redirectTo || window.location.origin;
        const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
        
        window.location.href = url;
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    signOut: async () => {
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('session');
        localStorage.removeItem('user');
        return { error: null };
      } catch (error) {
        return { error };
      }
    },

    getUser: async () => {
      try {
        // Obtener el token del localStorage
        const session = localStorage.getItem('supabase.auth.token');
        if (!session) {
          return { data: { user: null }, error: null };
        }

        const sessionData = JSON.parse(session);
        const token = sessionData.access_token;

        if (!token) {
          return { data: { user: null }, error: null };
        }

        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Si el token es inválido, limpiar el localStorage
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('session');
          localStorage.removeItem('user');
          return { data: { user: null }, error: new Error('Token inválido') };
        }

        const userData = await response.json();
        return { data: { user: userData }, error: null };
      } catch (error) {
        // En caso de error, limpiar el localStorage
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('session');
        localStorage.removeItem('user');
        return { data: { user: null }, error };
      }
    },

    getSession: async () => {
      try {
        const session = localStorage.getItem('supabase.auth.token');
        if (session) {
          const sessionData = JSON.parse(session);
          return { data: { session: sessionData }, error: null };
        }
        return { data: { session: null }, error: null };
      } catch (error) {
        return { data: { session: null }, error };
      }
    },

    onAuthStateChange: (callback) => {
      // Implementación simple del listener
      window.addEventListener('storage', (event) => {
        if (event.key === 'supabase.auth.token') {
          callback('SIGNED_IN', event.newValue ? JSON.parse(event.newValue) : null);
        }
      });
      
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    }
  },

  // Funciones para consultas de base de datos
  from: (table) => {
    return {
      select: (columns = '*') => {
        return {
          eq: (column, value) => {
            return {
              single: async () => {
                try {
                  const session = localStorage.getItem('supabase.auth.token');
                  if (!session) {
                    return { data: null, error: new Error('No hay sesión activa') };
                  }

                  const sessionData = JSON.parse(session);
                  const token = sessionData.access_token;

                  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${token}`,
                      'Range': '0-0'
                    }
                  });

                  if (!response.ok) {
                    throw new Error(`Error en la consulta: ${response.status}`);
                  }

                  const data = await response.json();
                  return { 
                    data: data.length > 0 ? data[0] : null, 
                    error: null 
                  };
                } catch (error) {
                  return { data: null, error };
                }
              }
            };
          }
        };
      }
    };
  }
};

// Exponer globalmente
window.supabase = supabase;