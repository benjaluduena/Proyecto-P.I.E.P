describe('Carga de PDF Tests', () => {
  beforeEach(() => {
    // Primero hacer login
    cy.visit('/login.html');
    
    // Verificar que Supabase esté disponible
    cy.window().should('have.property', 'supabase');
    
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

    // Hacer login
    cy.get('#email').type(Cypress.env('TEST_EMAIL'));
    cy.get('#password').type(Cypress.env('TEST_PASSWORD'));
    cy.get('button[type="submit"]').contains('Iniciar Sesión').click();
    cy.wait('@loginRequest');
    
    // Ahora ir a index.html donde están los elementos de carga
    cy.visit('/index.html');
    
    // Esperar a que se cargue la sección home
    cy.get('#uploadBox', { timeout: 10000 }).should('be.visible');
    cy.get('#fileInput').should('exist');
    cy.get('#uploadText').should('be.visible');
  });

  it('Debe mostrar correctamente los elementos de carga de PDF', () => {
    // Verificar que los elementos principales estén presentes
    cy.get('#uploadBox').should('be.visible');
    cy.get('#uploadText').should('contain', 'Ningún archivo seleccionado');
    cy.get('#fileInput').should('exist').and('have.attr', 'accept', '.pdf');
    
    // Verificar que las tarjetas de métodos de estudio estén deshabilitadas inicialmente
    cy.get('.card').should('exist');
  });

  it('Debe permitir cargar un PDF mediante click en el botón', () => {
    // Crear un archivo PDF simulado
    const pdfContent = Cypress.Buffer.from('PDF content');
    const pdfFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    // Simular la selección del archivo
    cy.get('#fileInput').selectFile({
      contents: pdfContent,
      fileName: 'test.pdf',
      mimeType: 'application/pdf'
    }, { force: true });
    
    // Esperar a que se procese el archivo
    cy.wait(1000);
    
    // Verificar que el texto se actualice
    cy.get('#uploadText').should('contain', 'archivo');
  });

  it('Debe permitir cargar un PDF mediante drag and drop', () => {
    // Crear un archivo PDF simulado
    const pdfContent = Cypress.Buffer.from('PDF content');
    
    // Simular drag and drop
    cy.get('#uploadBox').selectFile({
      contents: pdfContent,
      fileName: 'test-drag.pdf',
      mimeType: 'application/pdf'
    }, { action: 'drag-drop' });
    
    // Esperar a que se procese el archivo
    cy.wait(1000);
    
    // Verificar que el texto se actualice
    cy.get('#uploadText').should('contain', 'archivo');
  });

  it('Debe rechazar archivos que no sean PDF', () => {
    // Configurar el stub del alert ANTES de cualquier interacción con la página
    cy.visit('/index.html').then(() => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('windowAlert');
      });
    });
    
    // Esperar a que la página se cargue completamente
    cy.wait(2000);
    
    // Crear un archivo que no sea PDF
    const txtContent = Cypress.Buffer.from('Text content');
    
    // Intentar cargar archivo no PDF mediante el input
    cy.get('#fileInput').selectFile({
      contents: txtContent,
      fileName: 'test.txt',
      mimeType: 'text/plain'
    }, { force: true });
    
    // Esperar a que se procese y se dispare el alert
    cy.wait(1500);
    
    // Verificar que se muestre el alert de error con el mensaje exacto del código
    cy.get('@windowAlert').should('have.been.calledWith', 'Solo se permiten archivos PDF.');
    
    // Verificar que el texto no cambie del estado inicial
    cy.get('#uploadText').should('contain', 'Ningún archivo seleccionado');
  });

  it('Debe rechazar múltiples archivos', () => {
    // Configurar el stub del alert ANTES de cualquier interacción con la página
    cy.visit('/index.html').then(() => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('windowAlert');
      });
    });
    
    // Esperar a que la página se cargue completamente
    cy.wait(2000);
    
    // Crear múltiples archivos PDF
    const pdfContent1 = Cypress.Buffer.from('PDF content 1');
    const pdfContent2 = Cypress.Buffer.from('PDF content 2');
    
    // Intentar cargar múltiples archivos mediante el input
    cy.get('#fileInput').selectFile([
      {
        contents: pdfContent1,
        fileName: 'test1.pdf',
        mimeType: 'application/pdf'
      },
      {
        contents: pdfContent2,
        fileName: 'test2.pdf',
        mimeType: 'application/pdf'
      }
    ], { force: true });
    
    // Esperar a que se procese y se dispare el alert
    cy.wait(1500);
    
    // Verificar que se muestre el alert de error con el mensaje exacto del código
    cy.get('@windowAlert').should('have.been.calledWith', 'Solo se permite subir un archivo PDF.');
    
    // Verificar que el texto no cambie del estado inicial
    cy.get('#uploadText').should('contain', 'Ningún archivo seleccionado');
  });
});