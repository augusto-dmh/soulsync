from typing import Union
from dados import Dados
import datetime as dt
import httpx
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from urllib.parse import urlencode
import random
from starlette.middleware.sessions import SessionMiddleware

import string
from fastapi import HTTPException
from typing import Optional

import secrets

secret_key = secrets.token_urlsafe(32)

app = FastAPI()

app.add_middleware(
    SessionMiddleware, 
    secret_key=secret_key  # Substitua por uma chave segura e aleatória
)

# Configurar CORS
origins = [
    "http://127.0.0.1:5500",  # URL do Frontend
    "http://localhost:5500",  # URL do Localhost se necessário
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Atualize conforme necessário
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIENT_ID = "68096d2a19994062ba712677c80440f1"
CLIENT_SECRET = "8937e115c55a4ca8bb4433af69ce4ea9"
REDIRECT_URI = "http://127.0.0.1:8000/callback"

def generate_state(length=16):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@app.get("/")
def read_root():
    return RedirectResponse(url="http://127.0.0.1:5500/Frontend/index.html")

@app.get("/login")
async def login(request: Request):
    try:
        scope = "playlist-modify-public playlist-modify-private"
        state = generate_state()

        # Armazenar estado na sessão sem tentar criar objeto de sessão
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
        raise HTTPException(
            status_code=500,
            detail=f"Falha no login: {str(e)}"
        )

@app.get("/callback")
async def callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    stored_state = request.session.pop('state', None)

    if state != stored_state:
        return JSONResponse({"error": "State mismatch"}, status_code=400)

    if not code:
        return JSONResponse({"error": "Authorization code not found"}, status_code=400)

    token_url = "https://accounts.spotify.com/api/token"
    async with httpx.AsyncClient() as client:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = await client.post(token_url, data=data, headers=headers)
        response_json = response.json()

    if "access_token" in response_json:
        # Get user profile to get account_id
        async with httpx.AsyncClient() as client:
            me_response = await client.get(
                "https://api.spotify.com/v1/me",
                headers={"Authorization": f"Bearer {response_json['access_token']}"}
            )
            account_id = me_response.json()["id"]

        redirect_url = (
            f"http://127.0.0.1:5500/Frontend/index.html"
            f"?access_token={response_json['access_token']}"
            f"&refresh_token={response_json['refresh_token']}"
            f"&account_id={account_id}"
        )
        return RedirectResponse(redirect_url)
    else:
        return JSONResponse({"error": "Failed to retrieve access token"}, status_code=400)

@app.post("/create_playlist")
async def create_playlist(request: Request):
    try:
        body = await request.json()
        name = body.get("name")
        token = body.get("token")
        account_id = body.get("account_id")
        
        if not all([name, token, account_id]):
            return JSONResponse({"error": "Name, token and account_id are required"}, status_code=400)

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
            else:
                return JSONResponse(
                    {"error": f"Failed to create playlist: {response.text}"}, 
                    status_code=response.status_code
                )

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/refresh_token")
async def refresh_token():
    refresh_token_value = Dados.get_refresh_token()
    if not refresh_token_value:
        return JSONResponse({"error": "Nenhum token de atualização disponível"}, status_code=400)
    token_url = "https://accounts.spotify.com/api/token"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token_value,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response_json = response.json()
        if "access_token" in response_json:
            Dados.set_token(response_json["access_token"])
            return {"token": Dados.get_token()}
        else:
            return JSONResponse({"error": "Falha ao atualizar token"}, status_code=400)

@app.get("/search")
async def search_spotify(q: str, limit: Union[int] = 10):
    # "q" será genre:genre1,genre2,..., pode incluir vários gêneros
    # "limit" recebe um número para definir o limite de busca; o padrão é 10 se vazio

    token = Dados.get_token()
    if not token:
        return JSONResponse({"error": "Usuário não autenticado"}, status_code=401)

    api_url = "https://api.spotify.com/v1/search"
    # Exemplo de busca: http://127.0.0.1:8000/search?q=genre:metal,rock&limit=5

    async with httpx.AsyncClient() as client:
        client.headers["Authorization"] = f"Bearer {token}"
        # Definir os cabeçalhos da solicitação

        params = {"q": q, "type": "track", "market": "US", "limit": limit}
        # Definir os parâmetros da solicitação

        response = await client.get(api_url, params=params)
        # Fazer a solicitação GET e armazenar a resposta

    if response.status_code == 200:
        response_json = response.json()
        # Armazenar a resposta JSON

        return response_json
    else:
        print("Erro ao buscar")
        return {"tracks": {"items": []}}

@app.get("/get_genres")
async def genres():
    token = Dados.get_token()
    if not token:
        return JSONResponse({"error": "Usuário não autenticado"}, status_code=401)
    
    popular_genres = {
        "genres": [
            "pop",
            "rock",
            "hip-hop",
            "jazz",
            "classical",
            "electronic",
            "country",
            "reggae",
            "blues",
            "metal"
        ]
    }
    
    return popular_genres