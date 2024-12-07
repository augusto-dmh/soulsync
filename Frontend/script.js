const apiUrl = 'http://127.0.0.1:8000';

// Função para analisar os parâmetros da URL e armazenar tokens
async function parseTokensFromURL() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const accountId = params.get('account_id');

    if (accessToken && refreshToken && accountId) {
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken);
        localStorage.setItem('spotify_account_id', accountId);

        const tokenExpiryTime = Date.now() + (3600 * 1000);
        localStorage.setItem('token_expiry', tokenExpiryTime);
        
        updateAuthStatus(true);
    }
}

// Função para atualizar o status de autenticação na página
function updateAuthStatus(isAuthenticated) {
    const authStatusDiv = document.getElementById('auth-status');
    if (isAuthenticated) {
        authStatusDiv.innerHTML = 'Autenticado com sucesso!';
    } else {
        authStatusDiv.innerHTML = 'Não autenticado.';
    }
}

// Função para iniciar o login
function login() {
    window.location.href = `${apiUrl}/login`;
}

// Função para atualizar o token e armazená-lo no local storage
async function refreshToken() {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) {
        alert('Token de atualização não encontrado.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/refresh_token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('spotify_access_token', data.access_token);
            // Set new expiry time to 1 hour from now
            localStorage.setItem('token_expiry', Date.now() + (3600 * 1000));
        } else {
            alert('Falha ao atualizar o token.');
        }
    } catch (error) {
        console.error('Erro ao atualizar o token:', error);
        alert('Erro ao atualizar o token.');
    }
}

// Função para obter o token do local storage ou atualizá-lo se estiver expirado
async function getToken() {
    const token = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('token_expiry');

    if (!token || Date.now() > tokenExpiry) {
        await refreshToken();
        return localStorage.getItem('spotify_access_token');
    }

    return token;
}

// Função para lidar com logout
function logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('token_expiry');
    updateAuthStatus(false);
    alert('Você foi desconectado.');
}

// Chamar parseTokensFromURL ao carregar a página
window.onload = () => {
    parseTokensFromURL();
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
        updateAuthStatus(true);
    } else {
        updateAuthStatus(false);
    }
};

// Função para buscar faixas
async function searchTracks() {
    const token = await getToken();
    if (!token) {
        alert('Usuário não autenticado.');
        return;
    }

    const genre = document.getElementById('search-genre').value;
    const year = document.getElementById('search-year').value;
    const limit = 5;

    let searchQuery = `genre:${genre}`;
    if (year) {
        searchQuery += ` year:${year}`;
    }

    const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();

    const tracksDiv = document.getElementById('tracks');
    tracksDiv.innerHTML = '';

    if (data.tracks && data.tracks.items.length > 0) {
        data.tracks.items.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track';
            trackElement.innerHTML = `
                <img src="${track.album.images[0].url}" alt="${track.name}">
                <a href="${track.external_urls.spotify}" target="_blank">${track.name}</a>
            `;
            tracksDiv.appendChild(trackElement);
        });
    } else {
        tracksDiv.innerHTML = 'Nenhuma faixa encontrada.';
    }
}

// Função para criar uma playlist
async function createPlaylist() {
    const token = await getToken();
    const accountId = localStorage.getItem('spotify_account_id');
    
    if (!token || !accountId) {
        alert('Usuário não autenticado.');
        return;
    }

    const playlistName = document.getElementById('playlist-name').value;
    if (!playlistName) {
        alert('Por favor, forneça um nome para a playlist.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/create_playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name: playlistName, 
                token: token,
                account_id: accountId
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Playlist criada com sucesso!');
            document.getElementById('playlist-name').value = '';
        } else {
            alert(`Falha ao criar a playlist: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro ao criar a playlist:', error);
        alert('Erro ao criar a playlist. Por favor, tente novamente.');
    }
}

// Função para adicionar faixas a uma playlist diretamente via API do Spotify
async function addTrackToPlaylist() {
    const token = await getToken();
    if (!token) {
        alert('Usuário não autenticado.');
        return;
    }

    const playlistId = document.getElementById('playlist-id').value.trim();
    const trackIds = document.getElementById('track-ids').value.trim();

    if (!playlistId || !trackIds) {
        alert('Por favor, forneça tanto o ID da playlist quanto os IDs das faixas.');
        return;
    }

    // Limpar e validar IDs de faixas
    const trackUris = trackIds.split(',').map(trackId => trackId.trim()).filter(trackId => trackId).map(trackId => `spotify:track:${trackId}`);

    if (trackUris.length === 0) {
        alert('Nenhum ID de faixa válido fornecido.');
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uris: trackUris
            })
        });

        const data = await response.json();

        if (response.status === 201) {
            alert('Faixa(s) adicionada(s) com sucesso!');
            document.getElementById('track-ids').value = '';
        } else {
            const errorMsg = data.error?.message || 'Falha ao adicionar faixas';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Erro ao adicionar faixas:', error);
        alert('Falha ao adicionar faixas. Por favor, tente novamente.');
    }
}

// só comentar a de cima, descomentar a de baixo e a função da api so python e testar
// async function addTrackToPlaylist() {
//     const token = await getToken();
//     if (!token) {
//         alert('Usuário não autenticado.');
//         return;
//     }

//     const playlistId = document.getElementById('playlist-id').value.trim();
//     const trackIds = document.getElementById('track-ids').value.trim();

//     if (!playlistId || !trackIds) {
//         alert('Por favor, forneça tanto o ID da playlist quanto os IDs das faixas.');
//         return;
//     }

//     // Limpar e validar IDs de faixas
//     const trackUris = trackIds.split(',').map(trackId => trackId.trim()).filter(trackId => trackId).map(trackId => `spotify:track:${trackId}`);

//     if (trackUris.length === 0) {
//         alert('Nenhum ID de faixa válido fornecido.');
//         return;
//     }

//     try {
//         const response = await fetch(`${apiUrl}/add_to_playlist`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 playlist_id: playlistId,
//                 track_ids: trackUris.join(',')
//             })
//         });

//         const data = await response.json();

//         if (response.ok) {
//             alert('Faixa(s) adicionada(s) com sucesso!');
//             document.getElementById('track-ids').value = '';
//         } else {
//             const errorMsg = data.error || 'Falha ao adicionar faixas';
//             alert(errorMsg);
//         }
//     } catch (error) {
//         console.error('Erro ao adicionar faixas:', error);
//         alert('Falha ao adicionar faixas. Por favor, tente novamente.');
//     }
// }

// Função para obter gêneros disponíveis
async function getGenres() {
    const token = await getToken();
    if (!token) {
        alert('Usuário não autenticado.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/get_genres`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao obter gêneros');
        }

        const data = await response.json();
        const genresDiv = document.getElementById('genres');
        genresDiv.innerHTML = '';

        if (data.genres && data.genres.length > 0) {
            data.genres.forEach(genre => {
                const genreElement = document.createElement('div');
                genreElement.textContent = genre;
                genresDiv.appendChild(genreElement);
            });
        } else {
            genresDiv.innerHTML = 'Nenhum gênero encontrado.';
        }
    } catch (error) {
        console.error('Erro ao obter gêneros:', error);
        alert('Erro ao obter gêneros. Por favor, tente novamente.');
    }
}

function clearTracks() {
    document.getElementById('tracks').innerHTML = '';
}

function clearGenres() {
    document.getElementById('genres').innerHTML = '';
}