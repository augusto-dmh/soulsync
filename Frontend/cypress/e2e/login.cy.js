describe('Testes da página "Login"', () => {
  beforeEach(() => {
    cy.visit('http://127.0.0.1:5500/Frontend/login.html');
  });

  describe('Autenticação', () => {
    it('deve armazenar tokens após autenticação bem-sucedida', () => {
      // Clica no botão de login
      cy.get('.login-button').click();
  
      // Interage com a página de login do Spotify
      cy.origin('https://accounts.spotify.com', () => {
        cy.get('input#login-username').type(Cypress.env('SPOTIFY_USERNAME'));
        cy.get('input#login-password').type(Cypress.env('SPOTIFY_PASSWORD'));
        cy.get('button#login-button').click();
      });
  
      // Aguarda o redirecionamento de volta para a aplicação
      cy.url().should('include', 'menu.html');
      cy.url().should('include', 'access_token');
      cy.url().should('include', 'refresh_token');
      cy.url().should('include', 'account_id');
  
      // Verifica se os tokens foram armazenados no localStorage
      cy.window().then((win) => {
        win.parseTokensFromURL();
        
        expect(win.localStorage.getItem('spotify_access_token')).to.exist;
        expect(win.localStorage.getItem('spotify_refresh_token')).to.exist;
        expect(win.localStorage.getItem('spotify_account_id')).to.exist;
      });
    });
  });

  // Testes de Navegação
  describe('Barra de Navegação', () => {
    it('deve ter os links de navegação corretos', () => {
      // Checa se a navbar existe e contém todos os links corretamente
      cy.get('.navbar').within(() => {
        cy.get('a').should('have.length', 4)
        cy.contains('a', 'Playlists').should('exist');
        cy.contains('a', 'Homepage').should('exist');
        cy.contains('a', 'Faixas').should('exist');
        cy.contains('a', 'Login').should('exist');
      });
    });

    it('deve ter os links corretos', () => {
      // Checa se os links têm os destinos corretos
      cy.get('.navbar a[href="/Frontend/playlists.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/welcome.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/faixas.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/login.html"]').should('exist');
    });
  });
});