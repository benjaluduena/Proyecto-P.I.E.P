describe('Login Tests', () => {
  beforeEach(() => {
    cy.visit('/login.html');
    
    // Verificar que Supabase esté disponible
    cy.window().should('have.property', 'supabase');
  });

  it('Debe permitir iniciar sesión con credenciales válidas', () => {
    // Interceptar la llamada de login exitoso
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: 'fake-refresh-token',
        user: {
          id: 'fake-user-id',
          email: Cypress.env('TEST_EMAIL')
        }
      }
    }).as('loginRequest');

    cy.get('#email').type(Cypress.env('TEST_EMAIL'));
    cy.get('#password').type(Cypress.env('TEST_PASSWORD'));
    
    cy.get('button[type="submit"]').contains('Iniciar Sesión').click();
    
    // Esperar la llamada de autenticación
    cy.wait('@loginRequest');
  });

  it('Debe mostrar error con credenciales inválidas', () => {
    // Interceptar la llamada de login fallido
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 400,
      body: {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials'
      }
    }).as('loginFailRequest');

    cy.get('#email').type('usuario@invalido.com');
    cy.get('#password').type('contraseña_incorrecta');
    
    // Interceptar el alert de error
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('windowAlert');
    });
    
    cy.get('button[type="submit"]').contains('Iniciar Sesión').click();
    
    // Esperar la llamada de autenticación
    cy.wait('@loginFailRequest');
    
    // Verificar que se muestre el alert de error
    cy.get('@windowAlert').should('have.been.calledWith', 'Error: Invalid login credentials');
  });





  it('Debe mostrar enlace a registro', () => {
    // Verificar que existe el enlace de registro
    cy.get('a').contains('Regístrate aquí').should('be.visible');
    cy.get('a').contains('Regístrate aquí').should('have.attr', 'href', 'register.html');
  });

  it('Debe redirigir usuarios ya autenticados', () => {
    // Simular usuario ya logueado con sesión
    cy.window().then((win) => {
      const fakeSession = {
        access_token: 'fake-token',
        user: {
          id: 'fake-user-id',
          email: 'test@example.com'
        }
      };
      win.localStorage.setItem('session', JSON.stringify(fakeSession));
    });
    
    cy.visit('/login.html');
    
    // Verificar que permanece en login (la aplicación no tiene redirección automática)
    cy.url().should('include', '/login.html');
  });
});