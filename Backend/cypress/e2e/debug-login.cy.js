describe('Debug Login Test', () => {
  beforeEach(() => {
    // Interceptar todas las llamadas a la API
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: 1,
            email: 'benjagamerpro082@gmail.com',
            name: 'Usuario Test'
          },
          token: 'fake-jwt-token'
        }
      }
    }).as('loginRequest')
  })

  it('Debug: Verificar variables de entorno y comportamiento del botón', () => {
    // Verificar variables de entorno
    cy.log('TEST_EMAIL:', Cypress.env('TEST_EMAIL'))
    cy.log('TEST_PASSWORD:', Cypress.env('TEST_PASSWORD'))
    cy.log('FRONTEND_URL:', Cypress.env('FRONTEND_URL'))
    
    // Visitar la página
    cy.visit('/login.html')
    
    // Verificar que la página carga correctamente
    cy.get('body').should('be.visible')
    cy.get('.form-title').should('contain', 'Iniciar Sesión')
    
    // Verificar que los campos existen
    cy.get('#email').should('exist').and('be.visible')
    cy.get('#password').should('exist').and('be.visible')
    cy.get('button[type="submit"]').should('exist').and('be.visible')
    
    // Llenar los campos paso a paso
    cy.get('#email').clear().type(Cypress.env('TEST_EMAIL'))
    cy.get('#password').clear().type(Cypress.env('TEST_PASSWORD'))
    
    // Verificar que los valores se escribieron correctamente
    cy.get('#email').should('have.value', Cypress.env('TEST_EMAIL'))
    cy.get('#password').should('have.value', Cypress.env('TEST_PASSWORD'))
    
    // Hacer clic en el botón y verificar que se ejecuta
    cy.get('button[type="submit"]').contains('Iniciar Sesión').should('be.enabled').click()
    
    // Esperar un poco para ver qué pasa
    cy.wait(2000)
    
    // Verificar si se hizo la llamada a la API
    cy.get('@loginRequest.all').then((interceptions) => {
      cy.log('Número de llamadas interceptadas:', interceptions.length)
      if (interceptions.length > 0) {
        cy.log('Datos enviados:', interceptions[0].request.body)
      }
    })
  })

  it('Debug: Verificar formulario sin interceptar API', () => {
    cy.visit('/login.html')
    
    // Llenar formulario
    cy.get('#email').type('test@example.com')
    cy.get('#password').type('password123')
    
    // Verificar que el botón está habilitado
    cy.get('button[type="submit"]').should('not.be.disabled')
    
    // Hacer clic y ver qué pasa
    cy.get('button[type="submit"]').click()
    
    // Esperar y ver si hay algún cambio en la URL o en la página
    cy.wait(3000)
    cy.url().then((url) => {
      cy.log('URL actual:', url)
    })
  })
})