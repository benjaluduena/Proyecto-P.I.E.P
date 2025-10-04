describe('Funcionalidad de Generación de Métodos de Estudio', () => {
  beforeEach(() => {
    // Limpiar datos de prueba
    cy.cleanupTestData()
    
    // Configurar mocks de API
    cy.mockApiResponses()
    
    // Hacer login y cargar PDF
    cy.login()
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.waitForPageLoad()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
  })

  it('Debe generar un resumen exitosamente', () => {
    // Hacer clic en la tarjeta de resumen
    cy.get('[data-type="resumen"]').click()
    
    // Verificar que se muestra el modal de configuración
    cy.get('#modalResumen, .modal').should('be.visible')
    
    // Configurar opciones del resumen
    cy.get('#longitudResumen, select[name="length"]').select('medio')
    cy.get('#tipoResumen, select[name="type"]').select('puntos-clave')
    
    // Generar resumen
    cy.get('#generarResumen, button:contains("Generar")').click()
    
    // Verificar que se muestra indicador de carga
    cy.get('.loading, .generating').should('be.visible')
    
    // Esperar respuesta de la API
    cy.wait('@generateStudyMethod')
    
    // Verificar que se carga la página del resumen
    cy.url().should('include', '/resumen')
    cy.get('#resumenContent, .resumen-container').should('be.visible')
    
    // Verificar que el contenido se generó
    cy.get('#resumenContent, .resumen-container').should('not.be.empty')
    
    // Verificar que aparecen los botones de acción
    cy.get('button:contains("Volver"), .btn-back').should('be.visible')
    cy.get('button:contains("Guardar"), .btn-save').should('be.visible')
  })

  it('Debe generar preguntas de opción múltiple exitosamente', () => {
    // Hacer clic en la tarjeta de opción múltiple
    cy.get('[data-type="multiple-choice"]').click()
    
    // Verificar que se muestra el modal de configuración
    cy.get('#modalMultipleChoice, .modal').should('be.visible')
    
    // Configurar opciones
    cy.get('#numPreguntas, input[name="questions"]').clear().type('5')
    cy.get('#dificultad, select[name="difficulty"]').select('intermedio')
    
    // Generar preguntas
    cy.get('#generarMultipleChoice, button:contains("Generar")').click()
    
    // Verificar indicador de carga
    cy.get('.loading, .generating').should('be.visible')
    
    // Esperar respuesta
    cy.wait('@generateStudyMethod')
    
    // Verificar que se carga la página de preguntas
    cy.url().should('include', '/multiple-choice')
    cy.get('.question-container, #questionsContainer').should('be.visible')
    
    // Verificar que se generaron las preguntas
    cy.get('.question, .pregunta').should('have.length.at.least', 1)
    
    // Verificar estructura de pregunta
    cy.get('.question, .pregunta').first().within(() => {
      cy.get('.question-text, .pregunta-texto').should('be.visible')
      cy.get('.option, .opcion').should('have.length', 4)
    })
    
    // Verificar botones de navegación
    cy.get('button:contains("Siguiente"), .btn-next').should('be.visible')
    cy.get('button:contains("Finalizar"), .btn-finish').should('be.visible')
  })

  it('Debe generar preguntas verdadero/falso exitosamente', () => {
    // Hacer clic en la tarjeta de verdadero/falso
    cy.get('[data-type="verdadero-falso"]').click()
    
    // Verificar modal de configuración
    cy.get('#modalVerdaderoFalso, .modal').should('be.visible')
    
    // Configurar opciones
    cy.get('#numPreguntasVF, input[name="questions"]').clear().type('8')
    cy.get('#dificultadVF, select[name="difficulty"]').select('facil')
    
    // Generar preguntas
    cy.get('#generarVerdaderoFalso, button:contains("Generar")').click()
    
    // Verificar carga
    cy.get('.loading, .generating').should('be.visible')
    
    // Esperar respuesta
    cy.wait('@generateStudyMethod')
    
    // Verificar página de verdadero/falso
    cy.url().should('include', '/verdadero-falso')
    cy.get('.question-container, #questionsContainer').should('be.visible')
    
    // Verificar preguntas generadas
    cy.get('.question, .pregunta').should('have.length.at.least', 1)
    
    // Verificar estructura de pregunta V/F
    cy.get('.question, .pregunta').first().within(() => {
      cy.get('.question-text, .pregunta-texto').should('be.visible')
      cy.get('button:contains("Verdadero"), .btn-true').should('be.visible')
      cy.get('button:contains("Falso"), .btn-false').should('be.visible')
    })
  })

  it('Debe generar flashcards exitosamente', () => {
    // Hacer clic en la tarjeta de flashcards
    cy.get('[data-type="flashcards"]').click()
    
    // Verificar modal de configuración
    cy.get('#modalFlashcards, .modal').should('be.visible')
    
    // Configurar opciones
    cy.get('#numFlashcards, input[name="cards"]').clear().type('10')
    cy.get('#tipoFlashcards, select[name="type"]').select('conceptos')
    
    // Generar flashcards
    cy.get('#generarFlashcards, button:contains("Generar")').click()
    
    // Verificar carga
    cy.get('.loading, .generating').should('be.visible')
    
    // Esperar respuesta
    cy.wait('@generateStudyMethod')
    
    // Verificar página de flashcards
    cy.url().should('include', '/flashcards')
    cy.get('.flashcard-container, #flashcardsContainer').should('be.visible')
    
    // Verificar flashcard
    cy.get('.flashcard, .tarjeta').should('be.visible')
    cy.get('.flashcard-front, .frente').should('be.visible')
    
    // Verificar botones de navegación
    cy.get('button:contains("Voltear"), .btn-flip').should('be.visible')
    cy.get('button:contains("Siguiente"), .btn-next').should('be.visible')
  })

  it('Debe manejar errores de generación', () => {
    // Mock para error de generación
    cy.intercept('POST', '/api/study/generate', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Error al generar método de estudio'
      }
    }).as('generateError')
    
    // Intentar generar resumen
    cy.get('[data-type="resumen"]').click()
    cy.get('#modalResumen, .modal').should('be.visible')
    cy.get('#generarResumen, button:contains("Generar")').click()
    
    // Esperar error
    cy.wait('@generateError')
    
    // Verificar mensaje de error
    cy.get('.error-message, .alert-danger').should('be.visible')
      .and('contain', 'Error')
    
    // Verificar que no se redirige
    cy.url().should('not.include', '/resumen')
  })

  it('Debe validar campos requeridos en modales', () => {
    // Probar modal de opción múltiple
    cy.get('[data-type="multiple-choice"]').click()
    cy.get('#modalMultipleChoice, .modal').should('be.visible')
    
    // Limpiar campo requerido
    cy.get('#numPreguntas, input[name="questions"]').clear()
    
    // Intentar generar sin completar campos
    cy.get('#generarMultipleChoice, button:contains("Generar")').click()
    
    // Verificar validación
    cy.get('.error, .invalid-feedback').should('be.visible')
    
    // Verificar que no se procede sin datos válidos
    cy.get('.loading, .generating').should('not.exist')
  })

  it('Debe permitir cancelar la generación', () => {
    // Iniciar generación
    cy.get('[data-type="resumen"]').click()
    cy.get('#modalResumen, .modal').should('be.visible')
    cy.get('#generarResumen, button:contains("Generar")').click()
    
    // Verificar que aparece indicador de carga
    cy.get('.loading, .generating').should('be.visible')
    
    // Buscar y hacer clic en botón de cancelar
    cy.get('body').then($body => {
      if ($body.find('button:contains("Cancelar"), .btn-cancel').length > 0) {
        cy.get('button:contains("Cancelar"), .btn-cancel').click()
        
        // Verificar que se detiene la carga
        cy.get('.loading, .generating').should('not.exist')
        
        // Verificar que permanece en la página actual
        cy.url().should('not.include', '/resumen')
      }
    })
  })

  it('Debe mostrar progreso durante la generación', () => {
    // Mock con delay para simular generación lenta
    cy.intercept('POST', '/api/study/generate', (req) => {
      req.reply((res) => {
        setTimeout(() => {
          res.send({
            statusCode: 200,
            body: {
              success: true,
              data: {
                id: 'test-study-id',
                type: 'resumen',
                content: 'Contenido del resumen generado...'
              }
            }
          })
        }, 3000)
      })
    }).as('slowGenerate')
    
    // Iniciar generación
    cy.get('[data-type="resumen"]').click()
    cy.get('#modalResumen, .modal').should('be.visible')
    cy.get('#generarResumen, button:contains("Generar")').click()
    
    // Verificar indicadores de progreso
    cy.get('.loading, .generating, .progress').should('be.visible')
    cy.get('.progress-text, .loading-text').should('contain.text', 'Generando')
    
    // Esperar a que termine
    cy.wait('@slowGenerate')
    
    // Verificar que desaparece el indicador
    cy.get('.loading, .generating, .progress').should('not.exist')
  })
})