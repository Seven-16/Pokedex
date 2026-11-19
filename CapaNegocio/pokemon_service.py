"""Application rules; independent of FastAPI routes and HTTP responses."""
import asyncio
import re
import time
import unicodedata
from typing import Protocol

from CapaNegocio.errors import PokemonNotFound
from CapaNegocio.models import (
    CatalogEntry, Generation, Metadata, Pokemon, PokemonPage,
    PokemonSummary, PokemonSummaryPage,
)


class PokemonRepository(Protocol):
    async def get(self, resource: str) -> dict: ...


def normalize(value: str) -> str:
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', value.strip().lower()) if not unicodedata.combining(c))
    normalized = normalized.replace('♀', '-f').replace('♂', '-m').replace('’', '').replace("'", '').replace('.', '').replace(' ', '-')
    normalized = re.sub('-+', '-', normalized)
    return {'codigo-cero': 'type-null', 'teselia': 'unova'}.get(normalized, normalized)


def resource_id(url: str) -> int:
    return int(url.rstrip('/').split('/')[-1])


class PokemonService:
    def __init__(self, repository: PokemonRepository):
        self.repository = repository
        self._entries: list[CatalogEntry] = []
        self._generations: list[Generation] = []
        self._expires = 0.0
        self._lock = asyncio.Lock()

    async def catalog(self) -> list[CatalogEntry]:
        async with self._lock:
            if self._entries and self._expires > time.monotonic():
                return self._entries
            index = await self.repository.get('generation?limit=100')
            generations = await asyncio.gather(*(self.repository.get(f'generation/{resource_id(g["url"])}') for g in index['results']))
            entries = {}
            metadata = []
            for generation in generations:
                region = generation['main_region']['name']
                metadata.append(Generation(id=generation['id'], name=generation['name'], region=region))
                for species in generation['pokemon_species']:
                    identifier = resource_id(species['url'])
                    # Hisui species share generation VIII with Galar. Meltan's origin is unknown.
                    origin = 'hisui' if 899 <= identifier <= 905 else 'desconocida' if identifier in (808, 809) else region
                    entries[identifier] = CatalogEntry(id=identifier, name=species['name'], generation=generation['id'], region=origin, image=f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{identifier}.png')
            self._entries = sorted(entries.values(), key=lambda entry: entry.id)
            self._generations = sorted(metadata, key=lambda item: item.id)
            self._expires = time.monotonic() + 86400
            return self._entries

    async def metadata(self) -> Metadata:
        entries = await self.catalog()
        return Metadata(total=len(entries), generations=self._generations, regions=list(dict.fromkeys(entry.region for entry in entries)))

    async def detail(self, identifier: str | int) -> Pokemon:
        entries = await self.catalog()
        query = normalize(str(identifier)).lstrip('#')
        entry = next((item for item in entries if (query.isdigit() and item.id == int(query)) or normalize(item.name) == query), None)
        if not entry:
            raise PokemonNotFound(str(identifier))
        pokemon, species = await asyncio.gather(self.repository.get(f'pokemon/{entry.id}'), self.repository.get(f'pokemon-species/{entry.id}'))
        description = next((item['flavor_text'] for item in reversed(species.get('flavor_text_entries', [])) if item['language']['name'] == 'es'), 'Todavía no hay una descripción en español para este Pokémon.')
        return Pokemon(**entry.model_dump(), types=[item['type']['name'] for item in pokemon['types']], description=' '.join(description.split()), height=pokemon['height'] / 10, weight=pokemon['weight'] / 10, stats={item['stat']['name']: item['base_stat'] for item in pokemon['stats']})

    async def _matches(
        self, query: str, generation: int | None, region: str | None, pokemon_type: str | None = None
    ) -> list[CatalogEntry]:
        entries = await self.catalog()
        term = normalize(query).lstrip('#')
        region = normalize(region) if region else None
        def matches_query(item: CatalogEntry) -> bool:
            if not term:
                return True
            if term.isdigit():
                return item.id == int(term)
            return term in normalize(item.name)

        type_ids = None
        if pokemon_type:
            data = await self.repository.get(f'type/{pokemon_type}')
            type_ids = {resource_id(item['pokemon']['url']) for item in data['pokemon']}

        return [
            item for item in entries
            if matches_query(item)
            and (generation is None or item.generation == generation)
            and (not region or item.region == region)
            and (type_ids is None or item.id in type_ids)
        ]

    async def _summary(self, entry: CatalogEntry) -> PokemonSummary:
        data = await self.repository.get(f'pokemon/{entry.id}')
        return PokemonSummary(
            **entry.model_dump(),
            types=[item['type']['name'] for item in data['types']],
        )

    async def search_summaries(
        self, query: str = '', generation: int | None = None,
        region: str | None = None, offset: int = 0, limit: int = 12,
        pokemon_type: str | None = None,
    ) -> PokemonSummaryPage:
        matches = await self._matches(query, generation, region, pokemon_type)
        results = await asyncio.gather(
            *(self._summary(item) for item in matches[offset:offset + limit])
        )
        return PokemonSummaryPage(total=len(matches), offset=offset, limit=limit, results=results)

    async def search(
        self, query: str = '', generation: int | None = None,
        region: str | None = None, offset: int = 0, limit: int = 12,
        pokemon_type: str | None = None,
    ) -> PokemonPage:
        matches = await self._matches(query, generation, region, pokemon_type)
        results = await asyncio.gather(
            *(self.detail(item.id) for item in matches[offset:offset + limit])
        )
        return PokemonPage(total=len(matches), offset=offset, limit=limit, results=results)
