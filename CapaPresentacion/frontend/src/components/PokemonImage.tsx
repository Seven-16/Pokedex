import { useEffect, useState } from "react";
import { displayName, typeNames, type CatalogEntry } from "../api";
import { Pokeball } from "./Loading";

// Serve the same official artwork through a CDN, retaining GitHub as a fallback.
function imageSources(url: string): [string, string?] {
  const prefix = "https://raw.githubusercontent.com/PokeAPI/sprites/master/";
  if (!url.startsWith(prefix)) return [url];
  return [`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/${url.slice(prefix.length)}`, url];
}

export function PokemonImage({
  entry,
  priority = false,
}: {
  entry: CatalogEntry;
  priority?: boolean;
}) {
  const [source, setSource] = useState(() => imageSources(entry.image)[0]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSource(imageSources(entry.image)[0]);
    setFailed(false);
  }, [entry.image]);
  return failed ? (
    <div className="image-fallback">
      <Pokeball />
      <span>Imagen no disponible</span>
    </div>
  ) : (
    <img
      src={source}
      alt={displayName(entry.name)}
      width="475"
      height="475"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => {
        const fallback = imageSources(entry.image)[1];
        if (fallback && source !== fallback) setSource(fallback);
        else setFailed(true);
      }}
    />
  );
}

export function Types({ types }: { types: string[] }) {
  return (
    <div className="types">
      {types.map((type) => (
        <span className={`type type-${type}`} key={type}>
          <i aria-hidden="true" />
          {typeNames[type] || displayName(type)}
        </span>
      ))}
    </div>
  );
}

