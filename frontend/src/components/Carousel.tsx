import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, Shuffle } from "lucide-react";
import { displayName, number, request, roman, type CatalogEntry, type Pokemon } from "../api";
import { Pokeball } from "./Loading";
import { PokemonImage, Types } from "./PokemonImage";

export function Carousel({
  entries,
  onOpen,
}: {
  entries: CatalogEntry[];
  onOpen: (pokemon: Pokemon) => void;
}) {
  const reduced = useReducedMotion();
  const shuffledEntries = useMemo(() => {
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [entries]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [detail, setDetail] = useState<Pokemon | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const entry = shuffledEntries[index % shuffledEntries.length];
  const currentDetail = detail?.id === entry?.id ? detail : null;
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
            setIndex((current) => {
              if (entries.length <= 1) return 0;
              const offset = 1 + Math.floor(Math.random() * (entries.length - 1));
              return (current + offset) % entries.length;
            });
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
            {currentDetail ? (
              <Types types={currentDetail.types} />
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
          disabled={!currentDetail && !failed}
          onClick={() => (currentDetail ? onOpen(currentDetail) : setRetry((r) => r + 1))}
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

