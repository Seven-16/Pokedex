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


class Pokemon(CatalogEntry):
    types: list[str]
    description: str
    height: float
    weight: float
    stats: dict[str, int]


class PokemonPage(BaseModel):
    total: int
    offset: int
    limit: int
    results: list[Pokemon]


class Metadata(BaseModel):
    total: int
    generations: list[Generation]
    regions: list[str]
