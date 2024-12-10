describe('Testes de page "Menu"', () => {
  // A página page "menu" é a url base para cada teste
  beforeEach(() => {
    cy.visit('http://127.0.0.1:5500/Frontend/menu.html')
  });

  // Testes de Navegação
  describe('Barra de Navegação', () => {
    // Checa se a navbar existe e contém todos os links corretamente
    it('deve ter os links de navegação corretos', () => {
      cy.get('.navbar').within(() => {
        cy.get('a').should('have.length', 4)
        cy.contains('a', 'Playlists').should('exist');
        cy.contains('a', 'Homepage').should('exist');
        cy.contains('a', 'Faixas').should('exist');
        cy.contains('a', 'Login').should('exist');
      });
    });

    // Checa se os links têm os destinos corretos
    it('deve ter os links corretos', () => {
      cy.get('.navbar a[href="/Frontend/playlists.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/welcome.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/faixas.html"]').should('exist');
      cy.get('.navbar a[href="/Frontend/login.html"]').should('exist');
    });
  });
  
  // Testes do Big Button
  describe('Botão do Spotify', () => {
    it('deve ter o link correto do Spotify', () => {
      // Checa se o Big Button existe e tem o link corretamente configurado (leva para a conta do SoulSync no Spotify ao abrir nova tab)
      cy.get('.big-button')
        .should('have.attr', 'href', 'https://open.spotify.com/user/31vq3eve7f3nlgr3k4dj2vjh2wh4')
        .and('have.attr', 'target', '_blank');
    });
  });
});