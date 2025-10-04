// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add fetch polyfill for Supabase compatibility
Cypress.on('window:before:load', (win) => {
  // Add fetch polyfill if not available
  if (!win.fetch) {
    win.fetch = (url, options = {}) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(options.method || 'GET', url)
        
        // Set headers
        if (options.headers) {
          Object.keys(options.headers).forEach(key => {
            xhr.setRequestHeader(key, options.headers[key])
          })
        }
        
        xhr.onload = () => {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText)
          }
          resolve(response)
        }
        
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(options.body)
      })
    }
  }
})

// Configuración global para todos los tests
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage()
  
  // Interceptar llamadas a la API para evitar errores de red en tests
  cy.intercept('GET', '/api/**', { fixture: 'api-response.json' }).as('apiCall')
})