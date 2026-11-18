from typing import Annotated
from fastapi import APIRouter, Depends, Query, Request
from CapaNegocio.models import CatalogEntry, Metadata, Pokemon, PokemonPage, PokemonSummaryPage
from CapaNegocio.pokemon_service import PokemonService

router = APIRouter(prefix='/api/v1', tags=['Pokédex'])


def get_service(request: Request) -> PokemonService:
    return request.app.state.pokemon_service


Service = Annotated[PokemonService, Depends(get_service)]


@router.get('/health')
async def health():
    return {'status': 'ok'}


@router.get('/metadata', response_model=Metadata)
async def metadata(service: Service):
    return await service.metadata()


@router.get('/catalog', response_model=list[CatalogEntry])
async def catalog(service: Service):
    return await service.catalog()


@router.get('/pokemon', response_model=PokemonPage)
async def search(service: Service, q: str = Query('', max_length=80), generation: int | None = Query(None, ge=1), region: str | None = Query(None, max_length=40), offset: int = Query(0, ge=0), limit: int = Query(12, ge=1, le=48)):
    return await service.search(q, generation, region, offset, limit)


@router.get('/pokemon-summary', response_model=PokemonSummaryPage)
async def search_summaries(
    service: Service,
    q: str = Query('', max_length=80),
    generation: int | None = Query(None, ge=1),
    region: str | None = Query(None, max_length=40),
    offset: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=48),
):
    return await service.search_summaries(q, generation, region, offset, limit)


@router.get('/pokemon/{identifier}', response_model=Pokemon)
async def detail(identifier: str, service: Service):
    return await service.detail(identifier)
