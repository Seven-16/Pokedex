import { useEffect, useState } from "react";
import { displayName, typeNames, type CatalogEntry } from "../api";
import { Pokeball } from "./Loading";

// Show a small sprite first, then replace it with the official artwork.
function imageSources(url: string, id: number): string[] {
  const prefix = "https://raw.githubusercontent.com/PokeAPI/sprites/master/";
  if (!url.startsWith(prefix)) return [url];
  const cdn = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/";
  return [
    `${cdn}sprites/pokemon/${id}.png`,
    `${prefix}sprites/pokemon/${id}.png`,
    `${cdn}${url.slice(prefix.length)}`,
    url,
  ];
}

export function PokemonImage({
  entry,
  priority = false,
}: {
  entry: CatalogEntry;
  priority?: boolean;
}) {
  // Reset the request and its timer synchronously whenever the entry changes.
  return <ImageLoader key={`${entry.id}:${entry.image}`} entry={entry} priority={priority} />;
}

function ImageLoader({ entry, priority }: { entry: CatalogEntry; priority: boolean }) {
  const sources = imageSources(entry.image, entry.id);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sources.length < 3) return;
    const artwork = new Image();
    let active = true;
    let timer: number;
    const loadArtwork = (index: number) => {
      if (!active || index >= sources.length) return;
      artwork.onload = () => {
        if (active) {
          window.clearTimeout(timer);
          setLoaded(false);
          setSourceIndex(index);
        }
      };
      artwork.onerror = () => {
        window.clearTimeout(timer);
        loadArtwork(index + 1);
      };
      timer = window.setTimeout(() => loadArtwork(index + 1), 5000);
      artwork.src = sources[index];
    };
    loadArtwork(2);
    return () => {
      active = false;
      window.clearTimeout(timer);
      artwork.onload = null;
      artwork.onerror = null;
    };
  }, [entry.image, entry.id]);

  useEffect(() => {
    if (loaded || sourceIndex >= sources.length) return;
    // A connection can hang without emitting an error. Try the next source.
    const timer = window.setTimeout(() => setSourceIndex((index) => index + 1), 5000);
    return () => window.clearTimeout(timer);
  }, [sourceIndex, loaded, sources.length]);

  return sourceIndex >= sources.length ? (
    <div className="image-fallback">
      <Pokeball />
      <span>Imagen no disponible</span>
    </div>
  ) : (
    <img
      key={sources[sourceIndex]}
      src={sources[sourceIndex]}
      alt={displayName(entry.name)}
      width="475"
      height="475"
      loading="eager"
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setSourceIndex((index) => index + 1)}
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

