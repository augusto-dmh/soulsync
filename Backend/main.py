from typing import Union
from dados import Dados 
import datetime as dt
import httpx

from fastapi import FastAPI

app = FastAPI()

CLIENT_ID = "68096d2a19994062ba712677c80440f1"
CLIENT_SECRET = "8937e115c55a4ca8bb4433af69ce4ea9"
# ids necessários para usar a API do spotify 

NEXT_TOKEN_UPDATE = -1
# colocado em -1 para abrir o programa e quando chamar "refresh_token()" gerar uma token

@app.get("/")
def read_root():
    return {"Hello": "World"}
# quando cair na root vai executar (remanescente do tutorial)

@app.get("/search")
async def search_spotify(q: str, year:str, limit:Union[int] = 10):
# "q" será genre:genero1, genero2, etc, podendo ter quantos genêros quiser
# "year" aceita um ano ou ano X até ano Y 
# "limit" recebe um número para definir o limite da busca, caso vazio o padrão é 10

    await refresh_token()
    # gerar ou revalidar token

    api_url = "https://api.spotify.com/v1/search"
    # exemplo de search: http://127.0.0.1:8000/search?q=genre:metal,rock&year=1980-1990&limit=5
    async with httpx.AsyncClient() as client:

        client.headers["Authorization"] = "Bearer " + Dados.get_token()
        # define os headers da requisição 
        
        params = {"q": q, "year":year, "type": "track", "market":"US", "limit":limit}
        # define os parametros da requisição 

        response = await client.get(api_url, params=params)
        # faz a requisição com GET e guarda numa variavel

    if(response.status_code != 404):

        response_json = response.json()
        # guarda o resultado em json numa variavel
        # Extrai os nomes das faixas, URLs das imagens e links das músicas
        tracks = [
            {
                "name": track["name"],
                "image_url": track["album"]["images"][0]["url"],
                "track_url": track["external_urls"]["spotify"]
            }
            for track in response_json.get("tracks", {}).get("items", [])
        ]

        return {"tracks": tracks}

    else:
        print("deu pau pesquisando")

async def create_playlist(name:str):

    await refresh_token()
    # gerar ou revalidar token

    api_url = "https://api.spotify.com/v1/users/31vq3eve7f3nlgr3k4dj2vjh2wh4/playlists"

    async with httpx.AsyncClient() as client:

        client.headers = httpx.Headers (
            {
                "Authorization": "Bearer " + Dados.get_token(),  
                "Content-Type": "application/json",
            }
        )

        query = {
            "name": name,
            "description": "Playlist criada pelo App SoulSync",
            "public": True
        }
        # define a query da requisição 

        response = await client.post(api_url, data=query)
        # faz a requisição com POST e guarda numa variavel

        if(response.status_code != 404):

            response_json = response.json()
            # guarda o resultado em json numa variavel

            #p_url = response_json["external_urls"]
            # guarda a url da playlist

            print(response_json)
        else:
            print("deu pau pegando gerando playlist")

@app.get("/get_genres")
async def genres():
# vai pegar todos gêneros musicais disponíveis da API do spotify

    await refresh_token()
    # gerar ou revalidar token

    api_url = "https://api.spotify.com/v1/recommendations/available-genre-seeds"

    async with httpx.AsyncClient() as client:

        client.headers["Authorization"] = "Bearer " + Dados.get_token()
         # define os headers da requisição 

        response = await client.get(api_url)
        # faz a requisição com GET e guarda numa variavel
        
        if(response.status_code != 404):

            response_json = response.json()
            # guarda o resultado em json numa variavel
            return(response_json)

        else:
            print("deu pau pegando o generos")


async def refresh_token():
# função para gerar e revalidar token

    now = dt.datetime.now()
    # pega o horário do sistema

    global NEXT_TOKEN_UPDATE
    global EXPIRES

    if(NEXT_TOKEN_UPDATE == -1 or now > NEXT_TOKEN_UPDATE):
    # condicional para saber se a token nunca foi gerada(-1) ou se a token expirou

        api_url = "https://accounts.spotify.com/api/token"

        async with httpx.AsyncClient() as client:

            client.headers["Content-Type"] = "application/x-www-form-urlencoded"
            # define os headers da requisição 

            query = {
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET
            }
            # define a query da requisição 

            response = await client.post(api_url, data=query)
            # faz a requisição com POST e guarda numa variavel

            if(response.status_code != 404):

                response_json = response.json()
                # guarda o resultado em json numa variavel

                token = response_json["access_token"]
                # guarda a token
                expires = response_json["expires_in"]
                # guarda o tempo em segundos da duração da token
                
                Dados.set_token(token)
                # guarda a token em outra "classe"

                print(Dados.get_token())
                # apenas exemplo para printar a token 

                EXPIRES = expires
                # pegando o tempo em que a token expira (tempo em segundos) 
            else:
                print("deu pau pegando a token")


            if(Dados.get_token() != None):
                NEXT_TOKEN_UPDATE = now + dt.timedelta(seconds=expires)
                # compara o horário em que a token foi gerada com o tempo de duração da token e gera uma data
            else:
                print("deu pau guardando a token")
    