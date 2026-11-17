import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Shuffle,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  displayName,
  number,
  request,
  roman,
  typeNames,
  type CatalogEntry,
  type Pokemon,
} from "./api";

export function Pokeball({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="white"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M4 32a28 28 0 0 1 56 0Z" fill="var(--red)" />
      <path d="M4 32h56" stroke="currentColor" strokeWidth="4" />
      <circle
        cx="32"
        cy="32"
        r="9"
        fill="white"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
}

export function Loader({ label = "Buscando Pokémon…" }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <Pokeball className="loading-ball" />
      <strong>{label}</strong>
      <span>Un momento, estamos abriendo la Pokédex.</span>
    </div>
  );
}

export function PokemonImage({
  entry,
  priority = false,
}: {
  entry: CatalogEntry;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [entry.image]);
  return failed ? (
    <div className="image-fallback">
      <Pokeball />
      <span>Imagen no disponible</span>
    </div>
  ) : (
    <img
      src={entry.image}
      alt={displayName(entry.name)}
      width="475"
      height="475"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
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

export function Carousel({
  entries,
  onOpen,
}: {
  entries: CatalogEntry[];
  onOpen: (pokemon: Pokemon) => void;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(24);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [detail, setDetail] = useState<Pokemon | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const entry = entries[index % entries.length];
  const playing = !paused && !reduced;
  useEffect(() => {
    const listener = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);
  useEffect(() => {
    if (!playing || hover || focused || !visible || !entries.length) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % entries.length),
      6500,
    );
    return () => clearInterval(timer);
  }, [playing, hover, focused, visible, entries.length]);
  useEffect(() => {
    if (!entry) return;
    const controller = new AbortController();
    setDetail(null);
    setFailed(false);
    request<Pokemon>(`/pokemon/${entry.id}`, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [entry?.id, retry]);
  const move = (direction: number) => {
    setIndex((i) => (i + direction + entries.length) % entries.length);
    setPaused(true);
  };
  if (!entry)
    return (
      <div className="hero-placeholder">
        <Pokeball />
        <span>Preparando el carrusel…</span>
      </div>
    );
  return (
    <section
      className="spotlight"
      aria-label="Carrusel de todos los Pokémon"
      aria-roledescription="carrusel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className="spotlight-top">
        <span>Descubre un nuevo compañero</span>
        <button
          className="shuffle-button"
          onClick={() => {
            setIndex(Math.floor(Math.random() * entries.length));
            setPaused(true);
          }}
        >
          <Shuffle size={14} />
          Al azar
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          className="featured"
          key={entry.id}
          initial={{ opacity: 0, x: reduced ? 0 : 22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduced ? 0 : -22 }}
          transition={{ duration: 0.22 }}
        >
          <span className="giant-number" aria-hidden="true">
            {String(entry.id).padStart(3, "0")}
          </span>
          <div className="hero-image">
            <PokemonImage entry={entry} priority />
          </div>
          <div className="featured-info">
            <span className="dex-number">{number(entry.id)}</span>
            <h2>{displayName(entry.name)}</h2>
            {detail ? (
              <Types types={detail.types} />
            ) : (
              <span className="featured-status">
                {failed ? "Ficha no disponible" : "Cargando tipos…"}
              </span>
            )}
            <p>
              {displayName(entry.region)} <span>·</span> Generación{" "}
              {roman(entry.generation)}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="spotlight-bottom">
        <button
          className="text-button"
          disabled={!detail && !failed}
          onClick={() => (detail ? onOpen(detail) : setRetry((r) => r + 1))}
        >
          {failed ? "Reintentar" : "Ver ficha"}
          <ArrowUpRight size={17} />
        </button>
        <div className="carousel-controls">
          <button
            className="icon-button"
            aria-label="Pokémon anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="icon-button"
            aria-label={playing ? "Pausar carrusel" : "Reanudar carrusel"}
            onClick={() => setPaused((p) => !p)}
            disabled={!!reduced}
            title={
              reduced
                ? "Reproducción desactivada por tu preferencia de movimiento reducido"
                : undefined
            }
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="icon-button"
            aria-label="Pokémon siguiente"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function PokemonCard({
  pokemon,
  onOpen,
  index,
}: {
  pokemon: Pokemon;
  onOpen: (pokemon: Pokemon) => void;
  index: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      className={`pokemon-card theme-${pokemon.types[0]}`}
      onClick={() => onOpen(pokemon)}
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 7) * 0.025 }}
      aria-label={`Ver ficha de ${displayName(pokemon.name)}, ${number(pokemon.id)}`}
    >
      <div className="card-art">
        <span className="dex-number">{number(pokemon.id)}</span>
        <span className="card-open">
          <ArrowUpRight size={19} />
        </span>
        <PokemonImage entry={pokemon} />
      </div>
      <div className="card-content">
        <h3>{displayName(pokemon.name)}</h3>
        <Types types={pokemon.types} />
        <div className="card-meta">
          <span>{displayName(pokemon.region)}</span>
          <span>Gen. {roman(pokemon.generation)}</span>
        </div>
      </div>
    </motion.button>
  );
}

const statNames: Record<string, string> = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "At. especial",
  "special-defense": "Def. especial",
  speed: "Velocidad",
};
export function PokemonDialog({
  pokemon,
  onClose,
}: {
  pokemon: Pokemon | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={!!pokemon}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`dialog-content theme-${pokemon?.types[0]}`}
          aria-describedby="pokemon-description"
        >
          {pokemon && (
            <>
              <div className="dialog-art">
                <span className="dex-number">{number(pokemon.id)}</span>
                <PokemonImage entry={pokemon} priority />
              </div>
              <div className="dialog-body">
                <Dialog.Title>{displayName(pokemon.name)}</Dialog.Title>
                <Types types={pokemon.types} />
                <Dialog.Description id="pokemon-description">
                  {pokemon.description}
                </Dialog.Description>
                <dl className="facts">
                  <div>
                    <dt>Región de origen</dt>
                    <dd>{displayName(pokemon.region)}</dd>
                  </div>
                  <div>
                    <dt>Generación</dt>
                    <dd>{roman(pokemon.generation)}</dd>
                  </div>
                  <div>
                    <dt>Altura</dt>
                    <dd>
                      {new Intl.NumberFormat("es").format(pokemon.height)} m
                    </dd>
                  </div>
                  <div>
                    <dt>Peso</dt>
                    <dd>
                      {new Intl.NumberFormat("es").format(pokemon.weight)} kg
                    </dd>
                  </div>
                </dl>
                <h3>Estadísticas base</h3>
                <div className="stats">
                  {Object.entries(pokemon.stats).map(([key, value]) => (
                    <div className="stat" key={key}>
                      <span>{statNames[key] || key}</span>
                      <meter
                        min={0}
                        max={255}
                        value={value}
                        aria-label={statNames[key] || key}
                      />
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Cerrar ficha"
          >
            <X size={22} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
