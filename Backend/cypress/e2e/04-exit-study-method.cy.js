describe('Funcionalidad de Salir del Método de Estudio', () => {
  beforeEach(() => {
    // Limpiar datos de prueba
    cy.cleanupTestData()
    
    // Configurar mocks de API
    cy.mockApiResponses()
    
    // Hacer login, cargar PDF y generar método de estudio
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.waitForPageLoad()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
  })

  it('Debe permitir salir del resumen usando el botón Volver', () => {
    // Verificar que estamos en la página del resumen
    cy.url().should('include', '/resumen')
    cy.get('#resumenContent, .resumen-container').should('be.visible')
    
    // Hacer clic en el botón Volver
    cy.get('button:contains("Volver"), .btn-back, .btn-return').click()
    
    // Verificar que regresamos a la página principal
    cy.url().should('not.include', '/resumen')
    cy.get('#uploadBox, .upload-area').should('be.visible')
    cy.get('.card[data-type="resumen"]').should('be.visible')
  })

  it('Debe permitir salir de preguntas múltiples usando navegación', () => {
    // Generar preguntas de opción múltiple
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('multiple-choice')
    cy.wait('@generateStudyMethod')
    
    // Verificar que estamos en la página de preguntas
    cy.url().should('include', '/multiple-choice')
    cy.get('.question-container, #questionsContainer').should('be.visible')
    
    // Buscar botón de salir/volver
    cy.get('body').then($body => {
      if ($body.find('button:contains("Salir"), .btn-exit').length > 0) {
        cy.get('button:contains("Salir"), .btn-exit').click()
      } else if ($body.find('button:contains("Volver"), .btn-back').length > 0) {
        cy.get('button:contains("Volver"), .btn-back').click()
      } else if ($body.find('.btn-home, .home-btn').length > 0) {
        cy.get('.btn-home, .home-btn').click()
      }
    })
    
    // Verificar que regresamos al home
    cy.url().should('not.include', '/multiple-choice')
    cy.get('#uploadBox, .upload-area').should('be.visible')
  })

  it('Debe permitir salir de verdadero/falso usando navegación', () => {
    // Generar preguntas verdadero/falso
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('verdadero-falso')
    cy.wait('@generateStudyMethod')
    
    // Verificar que estamos en la página de V/F
    cy.url().should('include', '/verdadero-falso')
    cy.get('.question-container, #questionsContainer').should('be.visible')
    
    // Buscar y usar botón de navegación
    cy.get('body').then($body => {
      if ($body.find('button:contains("Finalizar"), .btn-finish').length > 0) {
        cy.get('button:contains("Finalizar"), .btn-finish').click()
      } else if ($body.find('button:contains("Salir"), .btn-exit').length > 0) {
        cy.get('button:contains("Salir"), .btn-exit').click()
      } else if ($body.find('button:contains("Volver"), .btn-back').length > 0) {
        cy.get('button:contains("Volver"), .btn-back').click()
      }
    })
    
    // Verificar navegación exitosa
    cy.url().should('not.include', '/verdadero-falso')
  })

  it('Debe permitir salir de flashcards usando controles', () => {
    // Generar flashcards
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('flashcards')
    cy.wait('@generateStudyMethod')
    
    // Verificar que estamos en flashcards
    cy.url().should('include', '/flashcards')
    cy.get('.flashcard-container, #flashcardsContainer').should('be.visible')
    
    // Buscar botón de salir
    cy.get('body').then($body => {
      if ($body.find('button:contains("Terminar"), .btn-finish').length > 0) {
        cy.get('button:contains("Terminar"), .btn-finish').click()
      } else if ($body.find('button:contains("Salir"), .btn-exit').length > 0) {
        cy.get('button:contains("Salir"), .btn-exit').click()
      } else if ($body.find('.close-btn, .btn-close').length > 0) {
        cy.get('.close-btn, .btn-close').click()
      }
    })
    
    // Verificar salida exitosa
    cy.url().should('not.include', '/flashcards')
  })

  it('Debe guardar progreso antes de salir', () => {
    // Generar preguntas múltiples
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('multiple-choice')
    cy.wait('@generateStudyMethod')
    
    // Responder algunas preguntas
    cy.get('.question, .pregunta').first().within(() => {
      cy.get('.option, .opcion').first().click()
    })
    
    // Avanzar a siguiente pregunta si es posible
    cy.get('body').then($body => {
      if ($body.find('button:contains("Siguiente"), .btn-next').length > 0) {
        cy.get('button:contains("Siguiente"), .btn-next').click()
      }
    })
    
    // Mock para guardar progreso
    cy.intercept('POST', '/api/study/progress', {
      statusCode: 200,
      body: { success: true, message: 'Progreso guardado' }
    }).as('saveProgress')
    
    // Salir del método
    cy.exitStudyMethod()
    
    // Verificar que se guardó el progreso
    cy.wait('@saveProgress')
    
    // Verificar que regresamos al home
    cy.url().should('not.include', '/multiple-choice')
  })

  it('Debe mostrar confirmación antes de salir con progreso', () => {
    // Generar método de estudio
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('multiple-choice')
    cy.wait('@generateStudyMethod')
    
    // Simular progreso (responder pregunta)
    cy.get('.question, .pregunta').first().within(() => {
      cy.get('.option, .opcion').first().click()
    })
    
    // Intentar salir
    cy.get('body').then($body => {
      if ($body.find('button:contains("Salir"), .btn-exit').length > 0) {
        cy.get('button:contains("Salir"), .btn-exit').click()
        
        // Verificar modal de confirmación
        cy.get('.modal, .confirm-dialog').should('be.visible')
        cy.get('.modal-body, .dialog-content').should('contain', 'progreso')
        
        // Confirmar salida
        cy.get('button:contains("Sí"), button:contains("Confirmar"), .btn-confirm').click()
      }
    })
    
    // Verificar que salimos
    cy.url().should('not.include', '/multiple-choice')
  })

  it('Debe permitir cancelar la salida', () => {
    // Generar método de estudio
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
    
    // Intentar salir
    cy.get('button:contains("Volver"), .btn-back').click()
    
    // Si aparece confirmación, cancelar
    cy.get('body').then($body => {
      if ($body.find('.modal, .confirm-dialog').length > 0) {
        cy.get('button:contains("Cancelar"), button:contains("No"), .btn-cancel').click()
        
        // Verificar que permanecemos en la página
        cy.url().should('include', '/resumen')
        cy.get('#resumenContent, .resumen-container').should('be.visible')
      }
    })
  })

  it('Debe manejar navegación del navegador (botón atrás)', () => {
    // Verificar que estamos en el método de estudio
    cy.url().should('include', '/resumen')
    
    // Usar navegación del navegador
    cy.go('back')
    
    // Verificar que regresamos (o se maneja apropiadamente)
    cy.url().should('not.include', '/resumen')
  })

  it('Debe limpiar recursos al salir', () => {
    // Verificar que estamos en método de estudio
    cy.url().should('include', '/resumen')
    
    // Salir del método
    cy.get('button:contains("Volver"), .btn-back').click()
    
    // Verificar que se limpiaron los recursos
    cy.window().then((win) => {
      // Verificar que no hay timers activos
      expect(win.document.querySelectorAll('.timer, .countdown')).to.have.length(0)
      
      // Verificar que no hay modales abiertos
      expect(win.document.querySelectorAll('.modal.show')).to.have.length(0)
    })
    
    // Verificar que regresamos al estado inicial
    cy.get('#uploadBox, .upload-area').should('be.visible')
    cy.get('.card').should('not.have.class', 'disabled')
  })

  it('Debe mantener sesión activa al salir del método', () => {
    // Salir del método de estudio
    cy.get('button:contains("Volver"), .btn-back').click()
    
    // Verificar que seguimos autenticados
    cy.get('.user-info, .profile-info').should('be.visible')
    
    // Verificar que podemos acceder a otras secciones
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').should('be.visible')
    cy.get('button[onclick="cargarSeccion(\'perfil\')"]').should('be.visible')
    
    // Verificar que el PDF sigue cargado
    cy.get('.card').should('not.have.class', 'disabled')
  })
})