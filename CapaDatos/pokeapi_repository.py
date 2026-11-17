"""Infrastructure: HTTP, bounded concurrency and persistent TTL cache."""
import asyncio
import json
import sqlite3
import time
from pathlib import Path

import httpx


class PokemonNotFound(Exception):
    pass


class PokeAPIUnavailable(Exception):
    pass


class PokeAPIRepository:
    def __init__(self, client: httpx.AsyncClient, cache_path: Path | None = None):
        self.client = client
        self.cache_path = cache_path
        self.memory: dict[str, tuple[float, dict]] = {}
        self.locks: dict[str, asyncio.Lock] = {}
        self.semaphore = asyncio.Semaphore(12)
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(cache_path) as db:
                db.execute('CREATE TABLE IF NOT EXISTS responses (key TEXT PRIMARY KEY, expires REAL, value TEXT)')

    def _read_disk(self, key: str):
        if not self.cache_path:
            return None
        with sqlite3.connect(self.cache_path, timeout=15) as db:
            row = db.execute('SELECT expires, value FROM responses WHERE key = ?', (key,)).fetchone()
        return (row[0], json.loads(row[1])) if row and row[0] > time.time() else None

    def _write_disk(self, key: str, expires: float, data: dict):
        if self.cache_path:
            with sqlite3.connect(self.cache_path, timeout=15) as db:
                db.execute('INSERT OR REPLACE INTO responses VALUES (?, ?, ?)', (key, expires, json.dumps(data)))

    async def get(self, resource: str) -> dict:
        async with self.locks.setdefault(resource, asyncio.Lock()):
            cached = self.memory.get(resource)
            if cached and cached[0] > time.time():
                return cached[1]
            cached = await asyncio.to_thread(self._read_disk, resource)
            if cached:
                self.memory[resource] = cached
                return cached[1]
            try:
                async with self.semaphore:
                    response = await self.client.get(resource)
                    if response.status_code == 404:
                        raise PokemonNotFound(resource)
                    response.raise_for_status()
                    data = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                raise PokeAPIUnavailable('No se pudo consultar PokéAPI. Inténtalo de nuevo.') from exc
            expires = time.time() + 86400
            self.memory[resource] = (expires, data)
            await asyncio.to_thread(self._write_disk, resource, expires, data)
            return data
