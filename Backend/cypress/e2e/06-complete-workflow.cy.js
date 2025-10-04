describe('Flujo Completo de Funcionalidades', () => {
  beforeEach(() => {
    // Limpiar datos de prueba
    cy.cleanupTestData()
    
    // Configurar mocks de API
    cy.mockApiResponses()
  })

  it('Debe completar todo el flujo: Login → Cargar PDF → Generar Método → Salir → Verificar Historial', () => {
    // PASO 1: Iniciar sesión
    cy.visit('/login.html')
    cy.get('#email').type('test@example.com')
    cy.get('#password').type('password123')
    cy.get('#loginForm').submit()
    
    // Verificar login exitoso
    cy.wait('@loginRequest')
    cy.url().should('include', '/index.html')
    cy.waitForPageLoad()
    
    // PASO 2: Cargar PDF
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.waitForPageLoad()
    
    // Verificar que las tarjetas están deshabilitadas
    cy.get('.card').should('have.class', 'disabled')
    
    // Cargar PDF
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Verificar que las tarjetas se habilitaron
    cy.get('.card').should('not.have.class', 'disabled')
    
    // PASO 3: Generar método de estudio (Resumen)
    cy.get('[data-type="resumen"]').click()
    cy.get('#modalResumen, .modal').should('be.visible')
    cy.get('#longitudResumen, select[name="length"]').select('medio')
    cy.get('#generarResumen, button:contains("Generar")').click()
    
    // Esperar generación
    cy.wait('@generateStudyMethod')
    
    // Verificar que se cargó el resumen
    cy.url().should('include', '/resumen')
    cy.get('#resumenContent, .resumen-container').should('be.visible')
    cy.get('#resumenContent, .resumen-container').should('not.be.empty')
    
    // PASO 4: Guardar en historial
    cy.get('button:contains("Guardar"), .btn-save').click()
    cy.wait('@saveToHistory')
    
    // Verificar confirmación de guardado
    cy.get('.success-message, .alert-success').should('be.visible')
    
    // PASO 5: Salir del método de estudio
    cy.get('button:contains("Volver"), .btn-back').click()
    
    // Verificar que regresamos al home
    cy.url().should('not.include', '/resumen')
    cy.get('#uploadBox, .upload-area').should('be.visible')
    
    // PASO 6: Verificar en el historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.waitForPageLoad()
    
    // Verificar que se carga el historial
    cy.url().should('include', '/historial')
    cy.wait('@getHistory')
    
    // Verificar que aparece la sesión guardada
    cy.get('.session-item, .historial-item').should('have.length.at.least', 1)
    cy.get('.session-item, .historial-item').first().within(() => {
      cy.get('.session-type, .tipo').should('contain', 'resumen')
      cy.get('.session-title, .titulo').should('contain', 'Documento de Prueba')
      cy.get('.session-date, .fecha').should('be.visible')
    })
    
    // VERIFICACIÓN FINAL: Estado de la aplicación
    cy.get('.user-info, .profile-info').should('be.visible') // Usuario sigue logueado
    cy.get('.stats-container, .estadisticas').should('be.visible') // Estadísticas actualizadas
  })

  it('Debe manejar múltiples métodos de estudio en una sesión', () => {
    // Login y cargar PDF
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Generar RESUMEN
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
    cy.get('button:contains("Guardar"), .btn-save').click()
    cy.wait('@saveToHistory')
    cy.get('button:contains("Volver"), .btn-back').click()
    
    // Generar PREGUNTAS MÚLTIPLES
    cy.generateStudyMethod('multiple-choice')
    cy.wait('@generateStudyMethod')
    
    // Responder algunas preguntas
    cy.get('.question, .pregunta').first().within(() => {
      cy.get('.option, .opcion').first().click()
    })
    
    // Finalizar y guardar
    cy.get('body').then($body => {
      if ($body.find('button:contains("Finalizar"), .btn-finish').length > 0) {
        cy.get('button:contains("Finalizar"), .btn-finish').click()
        cy.wait('@saveToHistory')
      }
    })
    
    // Salir y verificar historial
    cy.exitStudyMethod()
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    
    // Verificar que aparecen ambos métodos
    cy.get('.session-item, .historial-item').should('have.length.at.least', 2)
  })

  it('Debe manejar errores durante el flujo completo', () => {
    // Login exitoso
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    
    // Error en carga de PDF
    cy.intercept('POST', '/api/pdfs/upload', {
      statusCode: 500,
      body: { success: false, error: 'Error de servidor' }
    }).as('uploadError')
    
    cy.uploadPDF()
    cy.wait('@uploadError')
    
    // Verificar manejo de error
    cy.get('.error-message, .alert-danger').should('be.visible')
    cy.get('.card').should('have.class', 'disabled') // Tarjetas siguen deshabilitadas
    
    // Reintentar con éxito
    cy.mockApiResponses() // Restaurar mocks exitosos
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Continuar flujo normal
    cy.get('.card').should('not.have.class', 'disabled')
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
    
    // Verificar recuperación exitosa
    cy.url().should('include', '/resumen')
    cy.get('#resumenContent, .resumen-container').should('be.visible')
  })

  it('Debe mantener estado entre navegaciones', () => {
    // Completar flujo inicial
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Navegar a perfil y regresar
    cy.get('button[onclick="cargarSeccion(\'perfil\')"]').click()
    cy.waitForPageLoad()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    
    // Verificar que el PDF sigue cargado
    cy.get('.card').should('not.have.class', 'disabled')
    cy.get('.uploaded-files, #uploadedFilesContainer').should('be.visible')
    
    // Generar método
    cy.generateStudyMethod('flashcards')
    cy.wait('@generateStudyMethod')
    
    // Navegar usando navegación del navegador
    cy.go('back')
    cy.go('forward')
    
    // Verificar que el estado se mantiene
    cy.url().should('include', '/flashcards')
    cy.get('.flashcard-container, #flashcardsContainer').should('be.visible')
  })

  it('Debe funcionar con diferentes tipos de archivos PDF', () => {
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    
    // Probar con PDF pequeño
    cy.fixture('test-document.pdf', 'base64').then(fileContent => {
      const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/pdf')
      const file = new File([blob], 'small-document.pdf', { type: 'application/pdf' })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      
      cy.get('#fileInput').then(input => {
        input[0].files = dataTransfer.files
        input[0].dispatchEvent(new Event('change', { bubbles: true }))
      })
    })
    
    cy.wait('@uploadRequest')
    cy.get('.card').should('not.have.class', 'disabled')
    
    // Generar método con PDF pequeño
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
    
    // Verificar que funciona correctamente
    cy.url().should('include', '/resumen')
    cy.get('#resumenContent, .resumen-container').should('be.visible')
  })

  it('Debe manejar sesiones largas sin perder datos', () => {
    // Iniciar sesión larga
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Generar método de preguntas múltiples
    cy.generateStudyMethod('multiple-choice')
    cy.wait('@generateStudyMethod')
    
    // Simular sesión larga respondiendo múltiples preguntas
    for (let i = 0; i < 3; i++) {
      cy.get('.question, .pregunta').should('be.visible')
      cy.get('.option, .opcion').first().click()
      
      // Avanzar si hay botón siguiente
      cy.get('body').then($body => {
        if ($body.find('button:contains("Siguiente"), .btn-next').length > 0) {
          cy.get('button:contains("Siguiente"), .btn-next').click()
          cy.wait(1000) // Simular tiempo de respuesta
        }
      })
    }
    
    // Finalizar sesión
    cy.get('body').then($body => {
      if ($body.find('button:contains("Finalizar"), .btn-finish').length > 0) {
        cy.get('button:contains("Finalizar"), .btn-finish').click()
        cy.wait('@saveToHistory')
      }
    })
    
    // Verificar que se guardó correctamente
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    cy.get('.session-item, .historial-item').should('have.length.at.least', 1)
  })
})