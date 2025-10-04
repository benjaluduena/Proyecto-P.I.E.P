const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5500',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000
  },
  env: {
    FRONTEND_URL: 'http://localhost:5500',
    BACKEND_URL: 'http://localhost:5500/api',
    TEST_EMAIL: 'benjagamerpro082@gmail.com',
    TEST_PASSWORD: '123456'
  }
})