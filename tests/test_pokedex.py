import asyncio
import httpx
import pytest
from fastapi.testclient import TestClient
from CapaDatos.pokeapi_repository import PokeAPIRepository, PokemonNotFound, PokeAPIUnavailable
from CapaNegocio.pokemon_service import PokemonService, normalize
from CapaPresentacion.api.main import app
from CapaPresentacion.api.routes import get_service


class Repository:
    async def get(self, path):
        if path == 'generation?limit=100':
            return {'results': [{'url': f'https://pokeapi.co/api/v2/generation/{i}/'} for i in (1, 8)]}
        if path.startswith('generation/'):
            identifier = int(path.split('/')[1])
            species = [(1, 'bulbasaur'), (25, 'pikachu'), (132, 'ditto')] if identifier == 1 else [(810, 'grookey'), (899, 'wyrdeer')]
            return {'id': identifier, 'name': f'generation-{identifier}', 'main_region': {'name': 'kanto' if identifier == 1 else 'galar'}, 'pokemon_species': [{'name': name, 'url': f'https://pokeapi.co/api/v2/pokemon-species/{n}/'} for n, name in species]}
        if path.startswith('pokemon-species/'):
            return {'flavor_text_entries': [{'language': {'name': 'es'}, 'flavor_text': 'Texto\n en español.'}]}
        if path.startswith('pokemon/'):
            return {'types': [{'type': {'name': 'normal'}}], 'height': 3, 'weight': 40, 'stats': [{'stat': {'name': 'hp'}, 'base_stat': 48}]}
        raise AssertionError(path)


@pytest.fixture
def service():
    return PokemonService(Repository())


@pytest.mark.parametrize('query,ids', [('PIKA',[25]), ('#0025',[25]), ('0001',[1]), ('ditto',[132]), ('missing',[])])
def test_name_and_number(service, query, ids):
    result = asyncio.run(service.search(query))
    assert [p.id for p in result.results] == ids


def test_combined_filters_and_pagination(service):
    async def run():
        page = await service.search(region='Kanto', generation=1, offset=1, limit=1)
        assert page.total == 3 and [p.id for p in page.results] == [25]
        assert (await service.search('pikachu', generation=8)).total == 0
        assert [p.id for p in (await service.search(region='hisui')).results] == [899]
        assert [p.id for p in (await service.search(region='galar')).results] == [810]
    asyncio.run(run())


def test_summary_only_loads_data_needed_for_cards():
    class RecordingRepository(Repository):
        def __init__(self):
            self.calls = []

        async def get(self, path):
            self.calls.append(path)
            return await super().get(path)

    repository = RecordingRepository()
    service = PokemonService(repository)

    async def run():
        page = await service.search_summaries(region='kanto', offset=1, limit=1)
        assert page.total == 3
        assert page.results[0].id == 25
        assert page.results[0].types == ['normal']
        assert 'pokemon/25' in repository.calls
        assert not any(path.startswith('pokemon-species/') for path in repository.calls)
        await service.detail(25)
        assert 'pokemon-species/25' in repository.calls

    asyncio.run(run())


def test_detail_and_unknown(service):
    async def run():
        pokemon = await service.detail('132')
        assert pokemon.description == 'Texto en español.'
        assert pokemon.height == .3 and pokemon.weight == 4
        with pytest.raises(PokemonNotFound):
            await service.detail('not-a-pokemon')
    asyncio.run(run())


@pytest.mark.parametrize('value,expected', [('Mr. Mime', 'mr-mime'), ('Nidoran ♀', 'nidoran-f'), ('Farfetch’d', 'farfetchd'), ('Código Cero', 'type-null'), ('Teselia', 'unova')])
def test_friendly_names(value, expected):
    assert normalize(value) == expected


def test_api_upstream_failure():
    class Unavailable:
        async def search(self, *args):
            raise PokeAPIUnavailable('No se pudo consultar PokéAPI. Inténtalo de nuevo.')
    app.dependency_overrides[get_service] = lambda: Unavailable()
    try:
        response = TestClient(app).get('/api/v1/pokemon')
        assert response.status_code == 503
        assert response.headers['retry-after'] == '5'
        assert 'Inténtalo' in response.json()['detail']
    finally:
        app.dependency_overrides.clear()


def test_rest_contract(service):
    app.dependency_overrides[get_service] = lambda: service
    try:
        client = TestClient(app)
        assert client.get('/api/v1/health').json() == {'status': 'ok'}
        assert client.get('/api/v1/pokemon/ditto').json()['id'] == 132
        summary = client.get('/api/v1/pokemon-summary?q=25').json()
        assert summary['total'] == 1 and summary['results'][0]['id'] == 25
        assert 'description' not in summary['results'][0]
        assert client.get('/api/v1/pokemon?region=kanto&generation=8').json()['total'] == 0
        assert len(client.get('/api/v1/catalog').json()) == 5
        assert 'hisui' in client.get('/api/v1/metadata').json()['regions']
        assert client.get('/api/v1/pokemon/nope').status_code == 404
        for query in ('limit=100', 'offset=-1', 'generation=0'):
            assert client.get('/api/v1/pokemon?' + query).status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_cache_singleflight_and_persistence(tmp_path):
    calls = []
    def handler(request):
        calls.append(str(request.url))
        return httpx.Response(200, json={'name': 'ditto'})
    async def run():
        async with httpx.AsyncClient(base_url='https://pokeapi.co/api/v2/', transport=httpx.MockTransport(handler)) as client:
            repository = PokeAPIRepository(client, tmp_path / 'test.sqlite3')
            values = await asyncio.gather(*(repository.get('pokemon/132') for _ in range(8)))
            assert all(value['name'] == 'ditto' for value in values)
            assert len(calls) == 1
            fresh = PokeAPIRepository(client, tmp_path / 'test.sqlite3')
            assert (await fresh.get('pokemon/132'))['name'] == 'ditto'
            assert len(calls) == 1
    asyncio.run(run())


@pytest.mark.parametrize('status,exception', [(404, PokemonNotFound), (500, PokeAPIUnavailable)])
def test_upstream_errors(status, exception):
    async def run():
        async with httpx.AsyncClient(base_url='https://pokeapi.co/api/v2/', transport=httpx.MockTransport(lambda request: httpx.Response(status))) as client:
            with pytest.raises(exception):
                await PokeAPIRepository(client).get('pokemon/132')
    asyncio.run(run())
