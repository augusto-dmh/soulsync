const apiUrl = 'http://127.0.0.1:8000';

async function refreshToken() {
    const response = await fetch(`${apiUrl}/refresh_token`);
    const data = await response.json();
    localStorage.setItem('spotify_token', data.token);
    localStorage.setItem('token_expiry', Date.now() + 3600 * 1000); // token expira em 1h
}

async function getToken() {
    const token = localStorage.getItem('spotify_token');
    const tokenExpiry = localStorage.getItem('token_expiry');

    // caso token não esteja disponível no client-side ou tenha expirado, é gerado novamente o token e armazenado client-side
    if (!token || Date.now() > tokenExpiry) {
        await refreshToken();
        return localStorage.getItem('spotify_token');
    }

    return token;
}

// IIFE = função é executada imediatamente após ser lida
(function() {
    setInterval(refreshToken, 3600 * 1000); // a cada 1h o token é refrescado
    
    refreshToken(); // client-side tem acesso ao token de autenticação desde a 1º requisição
})();
