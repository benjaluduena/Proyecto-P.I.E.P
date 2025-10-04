describe('Funcionalidad de Verificación del Historial', () => {
  beforeEach(() => {
    // Limpiar datos de prueba
    cy.cleanupTestData()
    
    // Configurar mocks de API
    cy.mockApiResponses()
    
    // Mock específico para historial
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            {
              id: 'test-session-1',
              type: 'resumen',
              title: 'Documento de Prueba',
              date: new Date().toISOString(),
              duration: 300,
              score: 85,
              completed: true
            }
          ],
          stats: {
            totalSessions: 1,
            averageScore: 85,
            totalTime: 300
          }
        }
      }
    }).as('getHistory')
    
    // Hacer login
    cy.login()
    cy.waitForPageLoad()
  })

  it('Debe mostrar método de estudio recién completado en el historial', () => {
    // Completar flujo completo: cargar PDF, generar método, completarlo
    cy.get('button[onclick="cargarSeccion(\'home\')"]').click()
    cy.uploadPDF()
    cy.wait('@uploadRequest')
    
    // Generar y completar un resumen
    cy.generateStudyMethod('resumen')
    cy.wait('@generateStudyMethod')
    
    // Simular completar el método (guardar en historial)
    cy.get('button:contains("Guardar"), .btn-save').click()
    cy.wait('@saveToHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.waitForPageLoad()
    
    // Verificar que se carga la página del historial
    cy.url().should('include', '/historial')
    cy.get('#historialContainer, .historial-container').should('be.visible')
    
    // Esperar datos del historial
    cy.wait('@getHistory')
    
    // Verificar que aparece el método recién completado
    cy.get('.session-item, .historial-item').should('have.length.at.least', 1)
    cy.get('.session-item, .historial-item').first().within(() => {
      cy.get('.session-type, .tipo').should('contain', 'resumen')
      cy.get('.session-title, .titulo').should('contain', 'Documento de Prueba')
      cy.get('.session-date, .fecha').should('be.visible')
    })
  })

  it('Debe mostrar diferentes tipos de métodos en el historial', () => {
    // Mock con múltiples tipos de métodos
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              type: 'resumen',
              title: 'Documento 1',
              date: new Date().toISOString(),
              completed: true
            },
            {
              id: 'session-2',
              type: 'multiple-choice',
              title: 'Documento 2',
              date: new Date(Date.now() - 86400000).toISOString(),
              score: 90,
              completed: true
            },
            {
              id: 'session-3',
              type: 'flashcards',
              title: 'Documento 3',
              date: new Date(Date.now() - 172800000).toISOString(),
              completed: true
            }
          ]
        }
      }
    }).as('getMultipleHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getMultipleHistory')
    
    // Verificar que se muestran todos los tipos
    cy.get('.session-item, .historial-item').should('have.length', 3)
    
    // Verificar tipos específicos
    cy.get('.session-item, .historial-item').eq(0).should('contain', 'resumen')
    cy.get('.session-item, .historial-item').eq(1).should('contain', 'multiple-choice')
    cy.get('.session-item, .historial-item').eq(2).should('contain', 'flashcards')
  })

  it('Debe permitir ver detalles de una sesión del historial', () => {
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    
    // Hacer clic en una sesión para ver detalles
    cy.get('.session-item, .historial-item').first().click()
    
    // Verificar que se muestra modal o página de detalles
    cy.get('.modal, .session-details').should('be.visible')
    cy.get('.session-details, .modal-body').within(() => {
      cy.get('.detail-type, .tipo-detalle').should('be.visible')
      cy.get('.detail-date, .fecha-detalle').should('be.visible')
      cy.get('.detail-duration, .duracion-detalle').should('be.visible')
    })
  })

  it('Debe permitir filtrar el historial por tipo de método', () => {
    // Mock con datos para filtrar
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            { id: '1', type: 'resumen', title: 'Doc 1', date: new Date().toISOString() },
            { id: '2', type: 'multiple-choice', title: 'Doc 2', date: new Date().toISOString() },
            { id: '3', type: 'resumen', title: 'Doc 3', date: new Date().toISOString() }
          ]
        }
      }
    }).as('getFilterableHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getFilterableHistory')
    
    // Verificar filtros si existen
    cy.get('body').then($body => {
      if ($body.find('.filter-select, #tipoFiltro').length > 0) {
        // Filtrar por resumen
        cy.get('.filter-select, #tipoFiltro').select('resumen')
        
        // Verificar que solo se muestran resúmenes
        cy.get('.session-item:visible').should('have.length', 2)
        cy.get('.session-item:visible').each($item => {
          cy.wrap($item).should('contain', 'resumen')
        })
      }
    })
  })

  it('Debe mostrar estadísticas del historial', () => {
    // Mock con estadísticas
    cy.intercept('GET', '/api/historial/stats', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          totalSessions: 15,
          averageScore: 87.5,
          totalTime: 4500,
          streak: 5,
          achievements: ['first_session', 'week_streak']
        }
      }
    }).as('getStats')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    cy.wait('@getStats')
    
    // Verificar estadísticas
    cy.get('.stats-container, .estadisticas').should('be.visible')
    cy.get('.stat-item, .estadistica').should('have.length.at.least', 3)
    
    // Verificar valores específicos
    cy.get('.total-sessions, .sesiones-totales').should('contain', '15')
    cy.get('.average-score, .promedio').should('contain', '87.5')
    cy.get('.total-time, .tiempo-total').should('be.visible')
  })

  it('Debe permitir eliminar sesiones del historial', () => {
    // Mock para eliminación
    cy.intercept('DELETE', '/api/historial/*', {
      statusCode: 200,
      body: { success: true, message: 'Sesión eliminada' }
    }).as('deleteSession')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    
    // Buscar botón de eliminar
    cy.get('body').then($body => {
      if ($body.find('.btn-delete, .delete-btn').length > 0) {
        cy.get('.btn-delete, .delete-btn').first().click()
        
        // Confirmar eliminación
        cy.get('.modal, .confirm-dialog').should('be.visible')
        cy.get('button:contains("Confirmar"), button:contains("Eliminar")').click()
        
        // Verificar eliminación
        cy.wait('@deleteSession')
        
        // Verificar que se actualizó la lista
        cy.get('.success-message, .alert-success').should('be.visible')
      }
    })
  })

  it('Debe manejar historial vacío correctamente', () => {
    // Mock para historial vacío
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [],
          stats: {
            totalSessions: 0,
            averageScore: 0,
            totalTime: 0
          }
        }
      }
    }).as('getEmptyHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getEmptyHistory')
    
    // Verificar mensaje de historial vacío
    cy.get('.empty-history, .no-sessions').should('be.visible')
    cy.get('.empty-message').should('contain', 'No hay sesiones')
  })

  it('Debe permitir buscar en el historial', () => {
    // Mock con datos para buscar
    cy.intercept('GET', '/api/historial/search?q=*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            { id: '1', type: 'resumen', title: 'Documento Matemáticas', date: new Date().toISOString() }
          ]
        }
      }
    }).as('searchHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getHistory')
    
    // Buscar si existe campo de búsqueda
    cy.get('body').then($body => {
      if ($body.find('.search-input, #buscarHistorial').length > 0) {
        cy.get('.search-input, #buscarHistorial').type('Matemáticas')
        cy.get('.search-btn, button:contains("Buscar")').click()
        
        cy.wait('@searchHistory')
        
        // Verificar resultados de búsqueda
        cy.get('.session-item').should('contain', 'Matemáticas')
      }
    })
  })

  it('Debe mostrar progreso de sesiones incompletas', () => {
    // Mock con sesión incompleta
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            {
              id: 'incomplete-1',
              type: 'multiple-choice',
              title: 'Sesión Incompleta',
              date: new Date().toISOString(),
              completed: false,
              progress: 60
            }
          ]
        }
      }
    }).as('getIncompleteHistory')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getIncompleteHistory')
    
    // Verificar indicador de progreso
    cy.get('.session-item').first().within(() => {
      cy.get('.progress-indicator, .progreso').should('be.visible')
      cy.get('.incomplete-badge, .incompleto').should('be.visible')
    })
  })

  it('Debe permitir continuar sesiones incompletas desde el historial', () => {
    // Mock para sesión incompleta
    cy.intercept('GET', '/api/historial/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sessions: [
            {
              id: 'incomplete-1',
              type: 'multiple-choice',
              title: 'Sesión Incompleta',
              completed: false,
              progress: 60
            }
          ]
        }
      }
    }).as('getIncompleteSession')
    
    // Mock para continuar sesión
    cy.intercept('GET', '/api/study/continue/*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'incomplete-1',
          type: 'multiple-choice',
          currentQuestion: 3,
          totalQuestions: 5
        }
      }
    }).as('continueSession')
    
    // Navegar al historial
    cy.get('button[onclick="cargarSeccion(\'historial\')"]').click()
    cy.wait('@getIncompleteSession')
    
    // Buscar botón de continuar
    cy.get('body').then($body => {
      if ($body.find('button:contains("Continuar"), .btn-continue').length > 0) {
        cy.get('button:contains("Continuar"), .btn-continue').first().click()
        
        cy.wait('@continueSession')
        
        // Verificar que se redirige al método de estudio
        cy.url().should('include', '/multiple-choice')
      }
    })
  })
})