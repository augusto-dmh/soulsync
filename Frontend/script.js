const apiUrl = 'http://127.0.0.1:8000';

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
    }
}

function login() {
    window.location.href = `${apiUrl}/login`;
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) {
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/refresh_token`, {
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('spotify_access_token', data.access_token);
            const tokenExpiryTime = Date.now() + (3600 * 1000);
            localStorage.setItem('token_expiry', tokenExpiryTime);
            return data.access_token;
        }
        return null;
    } catch (error) {
        console.error('Erro ao atualizar token:', error);
        return null;
    }
}

async function getToken() {
    const token = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('token_expiry');

    if (!token || Date.now() > tokenExpiry) {
        return await refreshToken();
    }

    return token;
}

function logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_account_id');
    localStorage.removeItem('token_expiry');
    alert('Você foi desconectado.');
}

window.onload = () => {
    parseTokensFromURL();
};

async function searchTracks() {
    const token = await getToken();
    if (!token) {
        alert('Usuário não autenticado.');
        return;
    }

    const genre = document.getElementById('genre-select').value;
    const year = document.getElementById('decade-select').value;
    const limit = 5;

    let searchQuery = `genre:${genre}`;
    if (year) {
        searchQuery += ` year:${year}`;
    }

    try {
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
                trackElement.className = 'track-card';
                trackElement.innerHTML = `
                    <div class="track-info">
                        <div>
                            <img src="${track.album.images[1].url}" alt="${track.name}">
                            <h3>${track.name}</h3>
                            <p>Artista: ${track.artists[0].name}</p>
                            <p>Álbum: ${track.album.name}</p>
                        </div>
                        <a href="${track.external_urls.spotify}" target="_blank" class="spotify-button">
                            <img src="./imgs/spotify-logo.png" alt="Spotify Logo">
                            Ouvir no Spotify
                        </a>
                    </div>
                `;
                tracksDiv.appendChild(trackElement);
            });
        } else {
            tracksDiv.innerHTML = '<p>Nenhuma música encontrada.</p>';
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        alert('Erro ao buscar faixas.');
    }
}

async function createPlaylist() {
    const token = await getToken();
    const accountId = localStorage.getItem('spotify_account_id');
    
    if (!token || !accountId) {
        alert('Usuário não autenticado.');
        return;
    }

    const playlistName = document.getElementById('playlist-name').value.trim();

    if (!playlistName) {
        alert('Por favor, forneça um nome para a playlist.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/create_playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
            document.getElementById('playlist-id').value = data.id;
        } else {
            console.error('Erro ao criar playlist:', data);
            alert('Erro ao criar playlist: ' + (data.message || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error('Erro ao criar playlist:', error);
        alert('Erro ao criar playlist.');
    }
}

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

async function getGenres() {
    try {
        const response = await fetch(`${apiUrl}/get_genres`);
        const data = await response.json();
        
        const genreSelect = document.getElementById('genre-select');
        genreSelect.innerHTML = ''; // Clear previous genres
        
        data.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
            genreSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao obter gêneros:', error);
        alert('Falha ao carregar gêneros.');
    }
}

function updateYearLabel(year) {
    document.getElementById('year-label').textContent = year;
}

function clearTracks() {
    const tracksDiv = document.getElementById('tracks');
    tracksDiv.innerHTML = '';
}

function clearGenres() {
    const genreSelect = document.getElementById('genre-select');
    genreSelect.innerHTML = '';
}

function redirectWithParams(newUrl) {
    const currentParams = window.location.search;
    window.location.href = newUrl + currentParams;
}