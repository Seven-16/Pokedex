"""Errores del dominio compartidos por las capas de datos y presentación."""


class PokemonNotFound(Exception):
    """La especie solicitada no existe."""


class PokeAPIUnavailable(Exception):
    """No fue posible consultar los datos externos."""
