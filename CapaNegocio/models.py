from pydantic import BaseModel


class Generation(BaseModel):
    id: int
    name: str
    region: str


class CatalogEntry(BaseModel):
    id: int
    name: str
    generation: int
    region: str
    image: str


class PokemonSummary(CatalogEntry):
    types: list[str]


class Pokemon(PokemonSummary):
    description: str
    height: float
    weight: float
    stats: dict[str, int]


class PokemonPage(BaseModel):
    total: int
    offset: int
    limit: int
    results: list[Pokemon]


class PokemonSummaryPage(BaseModel):
    total: int
    offset: int
    limit: int
    results: list[PokemonSummary]


class Metadata(BaseModel):
    total: int
    generations: list[Generation]
    regions: list[str]
