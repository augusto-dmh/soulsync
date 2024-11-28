from typing import Union
from dados import Dados 
import datetime as dt
import httpx


from fastapi import FastAPI

app = FastAPI()

CLIENT_ID = "68096d2a19994062ba712677c80440f1"
CLIENT_SECRET = "8937e115c55a4ca8bb4433af69ce4ea9"

NEXT_TOKEN_UPDATE = -1

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/search")
async def search_spotify(q: str, year:str, limit:Union[int] = 10):

    await refresh_token()

    api_url = "https://api.spotify.com/v1/search"
    # exemplo de search
    # http://127.0.0.1:8000/search?q=genre:metal,rock&year=1980-1990&limit=5
    async with httpx.AsyncClient() as client:

        client.headers["Authorization"] = "Bearer " + Dados.get_token()
        
        params = {"q": q, "year":year, "type": "track", "market":"US", "limit":limit}

        response = await client.get(api_url, params=params)

    if(response.status_code != 404):

        response_json = response.json()
        tracks = [track["name"] for track in response_json.get("tracks", {}).get("items", [])]

        return {"tracks": tracks}

    else:
        print("deu pau pesquisando")


@app.get("/get_genres")
async def genres():

    await refresh_token()

    api_url = "https://api.spotify.com/v1/recommendations/available-genre-seeds"

    async with httpx.AsyncClient() as client:

        client.headers["Authorization"] = "Bearer " + Dados.get_token()

        response = await client.get(api_url)
        
        if(response.status_code != 404):

            response_json = response.json()
            return(response_json)

        else:
            print("deu pau pegando o generos")


# "privada..."
async def refresh_token():
    
    now = dt.datetime.now()

    global NEXT_TOKEN_UPDATE
    global EXPIRES

    # -1 significa que nunca foi gerada
    if(NEXT_TOKEN_UPDATE == -1 or now > NEXT_TOKEN_UPDATE):

        api_url = "https://accounts.spotify.com/api/token"

        async with httpx.AsyncClient() as client:

            client.headers["Content-Type"] = "application/x-www-form-urlencoded"

            query = {
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET
            }

            response = await client.post(api_url, data=query)

            if(response.status_code != 404):

                response_json = response.json()

                token = response_json["access_token"]
                expires = response_json["expires_in"]
                
                Dados.set_token(token)

                print(Dados.get_token())

                EXPIRES = expires
            else:
                print("deu pau pegando a token")


            if(Dados.get_token() != None):
                NEXT_TOKEN_UPDATE = now + dt.timedelta(seconds=expires)
            else:
                print("deu pau pegando a token")


    
    