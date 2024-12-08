from typing import Union
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from urllib.parse import urlencode
import random
import string
import httpx
import secrets
from starlette.middleware.sessions import SessionMiddleware
from fastapi import Header

app = FastAPI()

# configurações do aplicativo
secret_key = secrets.token_urlsafe(32)
CLIENT_ID = "68096d2a19994062ba712677c80440f1"
CLIENT_SECRET = "8937e115c55a4ca8bb4433af69ce4ea9"
REDIRECT_URI = "http://127.0.0.1:8000/callback"

# configuração dos middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=secret_key)

def generate_state(length=16):
    # gera uma string aleatória para segurança do estado
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@app.get("/")
def read_root():
    # redireciona para a página inicial
    return RedirectResponse(url="http://127.0.0.1:5500/Frontend/menu.html")

@app.get("/login")
async def login(request: Request):
    # inicia o processo de login no Spotify
    try:
        scope = "playlist-modify-public playlist-modify-private"
        state = generate_state()
        request.session["state"] = state
        
        params = {
            "response_type": "code",
            "client_id": CLIENT_ID,
            "scope": scope,
            "redirect_uri": REDIRECT_URI,
            "state": state
        }
        
        auth_url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
        return RedirectResponse(auth_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/callback")
async def callback(request: Request):
    # processa o retorno da autenticação do Spotify
    code = request.query_params.get("code")

    if not code:
        return JSONResponse({"error": "Código de autorização não encontrado"}, status_code=400)

    token_url = "https://accounts.spotify.com/api/token"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # obtém informações do perfil do usuário
            me_response = await client.get(
                "https://api.spotify.com/v1/me",
                headers={"Authorization": f"Bearer {data['access_token']}"}
            )
            account_id = me_response.json()["id"]

            redirect_url = (
                "http://127.0.0.1:5500/Frontend/menu.html"
                f"?access_token={data['access_token']}"
                f"&refresh_token={data['refresh_token']}"
                f"&account_id={account_id}"
            )
            return RedirectResponse(redirect_url)
        
        return JSONResponse({"error": "Falha ao obter token"}, status_code=400)

@app.get("/search")
async def search_spotify(
    q: str, 
    limit: int = 10,
    authorization: str = Header(None)
):
    # busca músicas no Spotify
    if not authorization:
        return JSONResponse({"error": "Não autorizado"}, status_code=401)

    token = authorization.replace("Bearer ", "")
    api_url = "https://api.spotify.com/v1/search"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            api_url,
            headers={"Authorization": f"Bearer {token}"},
            params={"q": q, "type": "track", "market": "US", "limit": limit}
        )

    if response.status_code == 200:
        return response.json()
    return {"tracks": {"items": []}}

@app.post("/create_playlist")
async def create_playlist(request: Request):
    # cria uma nova playlist no Spotify
    try:
        body = await request.json()
        name = body.get("name")
        token = body.get("token")
        account_id = body.get("account_id")
        
        if not all([name, token, account_id]):
            return JSONResponse({"error": "Nome, token e account_id são obrigatórios"}, status_code=400)

        api_url = f"https://api.spotify.com/v1/users/{account_id}/playlists"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "name": name,
                    "description": "Playlist criada pelo aplicativo SoulSync",
                    "public": True
                }
            )
            
            if response.status_code == 201:
                return response.json()
            return JSONResponse({"error": "Falha ao criar playlist"}, status_code=response.status_code)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/refresh_token")
async def refresh_token(authorization: str = Header(None)):
    # atualiza o token de acesso usando o refresh token
    if not authorization:
        return JSONResponse({"error": "Não autorizado"}, status_code=401)

    refresh_token = authorization.replace("Bearer ", "")
    token_url = "https://accounts.spotify.com/api/token"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            return response.json()
        return JSONResponse({"error": "Falha ao atualizar token"}, status_code=400)

@app.get("/get_genres")
async def genres():
    # retorna lista de gêneros musicais populares
    return {
        "genres": [
            "pop", "rock", "hip-hop", "jazz", "classical",
            "electronic", "country", "reggae", "blues", "metal"
        ]
    }