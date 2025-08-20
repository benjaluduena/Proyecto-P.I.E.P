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
  }
};

// Exponer globalmente
window.supabase = supabase;