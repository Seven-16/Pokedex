import os
from contextlib import asynccontextmanager
from pathlib import Path
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from CapaDatos.pokeapi_repository import PokeAPIRepository
from CapaNegocio.errors import PokemonNotFound, PokeAPIUnavailable
from CapaNegocio.pokemon_service import PokemonService
from CapaPresentacion.api.routes import router

ROOT = Path(__file__).resolve().parents[2]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(base_url='https://pokeapi.co/api/v2/', timeout=25, follow_redirects=True, headers={'User-Agent': 'Pokedex-Educational/1.0'}) as client:
        app.state.pokemon_service = PokemonService(PokeAPIRepository(client, ROOT / '.cache' / 'pokeapi.sqlite3'))
        yield


app = FastAPI(title='Pokédex REST API', version='1.0.0', description='Catálogo nacional. Región de origen, generación, filtros combinados y paginación.', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_methods=['GET'], allow_headers=['*'])


@app.exception_handler(PokemonNotFound)
async def not_found(request: Request, exc: PokemonNotFound):
    return JSONResponse(status_code=404, content={'detail': 'No encontramos ese Pokémon. Revisa el nombre o el número nacional.'})


@app.exception_handler(PokeAPIUnavailable)
async def unavailable(request: Request, exc: PokeAPIUnavailable):
    return JSONResponse(status_code=503, content={'detail': str(exc)}, headers={'Retry-After': '5'})


app.include_router(router)
frontend = ROOT / 'CapaPresentacion' / 'frontend' / 'dist'
if frontend.is_dir():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
