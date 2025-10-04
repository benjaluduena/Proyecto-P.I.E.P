// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Comando personalizado para login
Cypress.Commands.add('login', (email = Cypress.env('TEST_EMAIL'), password = Cypress.env('TEST_PASSWORD')) => {
  cy.visit('/login.html')
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  
  // Interceptar el alert de éxito del login
  cy.window().then((win) => {
    cy.stub(win, 'alert').as('loginAlert')
  })
  
  cy.get('button[type="submit"]').contains('Iniciar Sesión').click()
  
  // Esperar un momento para que se procese el login
  cy.wait(1000)
  
  // Navegar manualmente al index después del login
  cy.visit('/index.html')
})

// Comando personalizado para cargar un PDF
Cypress.Commands.add('uploadPDF', (fileName = 'test-document.pdf') => {
  // Asegurarse de que estamos en la página principal
  cy.url().then((url) => {
    if (!url.includes('/index.html')) {
      cy.visit('/index.html')
    }
  })
  
  // Esperar a que cargue la página y verificar que el uploadBox esté visible
  cy.get('#uploadBox').should('be.visible')
  
  // Simular la carga de un archivo PDF
  cy.fixture(fileName, 'base64').then(fileContent => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/pdf')
    const file = new File([blob], fileName, { type: 'application/pdf' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    
    cy.get('#fileInput').then(input => {
      input[0].files = dataTransfer.files
      input[0].dispatchEvent(new Event('change', { bubbles: true }))
    })
  })
  
  // Verificar que el archivo se cargó correctamente
  cy.get('#uploadText').should('not.contain', 'Ningún archivo seleccionado')
})

// Comando personalizado para generar un método de estudio
Cypress.Commands.add('generateStudyMethod', (methodType = 'resumen') => {
  // Asegurarse de que hay un PDF cargado
  cy.get('#uploadText').should('not.contain', 'Ningún archivo seleccionado')
  
  // Hacer clic en el método de estudio deseado
  cy.get(`[data-type="${methodType}"]`).should('be.visible').click()
  
  // Esperar a que aparezca el modal de confirmación o se inicie la generación
  cy.get('.loading-overlay, .modal, .generating-content').should('be.visible')
  
  // Esperar a que termine la generación (puede tomar tiempo)
  cy.get('.loading-overlay, .generating-content', { timeout: 30000 }).should('not.exist')
  
  // Verificar que se generó el contenido
  cy.url().should('match', new RegExp(`${methodType}\.html`))
})

// Comando personalizado para salir de un método de estudio
Cypress.Commands.add('exitStudyMethod', () => {
  // Buscar botones comunes para salir/volver
  cy.get('body').then($body => {
    if ($body.find('#backToHome').length > 0) {
      cy.get('#backToHome').click()
    } else if ($body.find('.btn-back, .back-button').length > 0) {
      cy.get('.btn-back, .back-button').first().click()
    } else if ($body.find('button:contains("Volver")').length > 0) {
      cy.get('button:contains("Volver")').first().click()
    } else if ($body.find('button:contains("Inicio")').length > 0) {
      cy.get('button:contains("Inicio")').first().click()
    } else {
      // Como último recurso, navegar directamente al inicio
      cy.visit('/index.html')
    }
  })
  
  // Verificar que estamos de vuelta en la página principal
  cy.url().should('include', '/index.html')
})

// Comando personalizado para verificar el historial
Cypress.Commands.add('checkHistorial', (expectedContent) => {
  // Navegar al historial
  cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
  
  // Esperar a que cargue el historial
  cy.get('#contentGrid, .content-grid').should('be.visible')
  
  // Verificar que existe contenido en el historial
  if (expectedContent) {
    cy.get('.content-item, .historial-item').should('contain', expectedContent)
  } else {
    // Verificar que hay al menos un elemento en el historial
    cy.get('.content-item, .historial-item').should('have.length.at.least', 1)
  }
})

// Comando personalizado para limpiar datos de prueba
Cypress.Commands.add('cleanupTestData', () => {
  // Limpiar localStorage
  cy.clearLocalStorage()
  
  // Limpiar sessionStorage
  cy.window().then((win) => {
    win.sessionStorage.clear()
  })
  
  // Limpiar cookies
  cy.clearCookies()
})

// Comando personalizado para esperar a que termine la carga
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('.loading, .loading-overlay, .spinner').should('not.exist')
  cy.get('body').should('be.visible')
})

// Comando personalizado para interceptar APIs
Cypress.Commands.add('mockApiResponses', () => {
  // Mock para login exitoso
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      user: {
        id: 'test-user-id',
        email: Cypress.env('TEST_EMAIL'),
        name: 'Usuario de Prueba'
      },
      token: 'mock-jwt-token'
    }
  }).as('loginRequest')
  
  // Mock para subida de PDF
  cy.intercept('POST', '/api/pdfs/upload', {
    statusCode: 201,
    body: {
      message: 'PDF subido exitosamente',
      pdf: {
        id: 'test-pdf-id',
        title: 'Documento de Prueba',
        fileName: 'test-document.pdf',
        fileUrl: '/uploads/test-document.pdf'
      }
    }
  }).as('uploadRequest')
  
  // Mock para generación de contenido IA
  cy.intercept('POST', '/api/ai/generate/**', {
    statusCode: 200,
    body: {
      success: true,
      content: {
        type: 'resumen',
        data: 'Contenido generado de prueba'
      }
    }
  }).as('generateContent')
  
  // Mock para historial
  cy.intercept('GET', '/api/historial/content*', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        {
          id: 'test-content-1',
          type: 'resumen',
          created_at: new Date().toISOString(),
          pdf_title: 'Documento de Prueba'
        }
      ]
    }
  }).as('historialRequest')
})