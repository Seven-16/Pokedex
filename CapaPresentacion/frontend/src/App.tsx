import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Carousel,
  Loader,
  Pokeball,
  PokemonCard,
  PokemonDialog,
} from "./components";
import {
  displayName,
  request,
  roman,
  type CatalogEntry,
  type Metadata,
  type PokemonSummary,
  type PokemonPage,
} from "./api";

type Filters = { q: string; generation: string; region: string; page: number };
const defaults: Filters = { q: "", generation: "", region: "", page: 1 };
function fromURL(): Filters {
  const params = new URLSearchParams(location.search);
  return {
    q: (params.get("q") || "").slice(0, 80),
    generation: /^[1-9]\d*$/.test(params.get("generation") || "")
      ? params.get("generation")!
      : "",
    region: params.get("region") || "",
    page: /^[1-9]\d*$/.test(params.get("page") || "")
      ? Math.min(10000, Number(params.get("page")))
      : 1,
  };
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(fromURL);
  const [input, setInput] = useState(filters.q);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [page, setPage] = useState<PokemonPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<PokemonSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogError("");
    Promise.all([
      request<CatalogEntry[]>("/catalog", controller.signal),
      request<Metadata>("/metadata", controller.signal),
    ])
      .then(([items, meta]) => {
        setCatalog(items);
        setMetadata(meta);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalogError(
            "No pudimos cargar el carrusel y los filtros. Comprueba la conexión y vuelve a intentarlo.",
          );
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: filters.q,
      offset: String((filters.page - 1) * 12),
      limit: "12",
    });
    if (filters.generation) params.set("generation", filters.generation);
    if (filters.region) params.set("region", filters.region);
    request<PokemonPage>(`/pokemon-summary?${params}`, controller.signal)
      .then(setPage)
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error && err.name !== "TypeError"
              ? err.message
              : "No pudimos conectar con la Pokédex. Comprueba que el servidor esté iniciado e inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, retry]);
  useEffect(() => {
    const pop = () => {
      const state = fromURL();
      setFilters(state);
      setInput(state.q);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !selected
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected]);
  function update(next: Filters) {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.generation) params.set("generation", next.generation);
    if (next.region) params.set("region", next.region);
    if (next.page > 1) params.set("page", String(next.page));
    history.pushState(
      null,
      "",
      `${location.pathname}${params.size ? "?" + params : ""}`,
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    update({ ...filters, q: input.trim(), page: 1 });
  }
  function reset() {
    setInput("");
    update({ ...defaults });
  }
  function open(pokemon: PokemonSummary) {
    lastFocused.current = document.activeElement as HTMLElement;
    setSelected(pokemon);
  }
  function close() {
    setSelected(null);
    requestAnimationFrame(() => lastFocused.current?.focus());
  }
  const active = !!(filters.q || filters.generation || filters.region);
  const pages = Math.max(1, Math.ceil((page?.total || 0) / 12));
  return (
    <>
      <a className="skip-link" href="#explorar">
        Saltar al buscador
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="Pokédex, inicio">
            <Pokeball />
            <span>
              pokédex<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label="Principal">
            <a className="nav-active" href="#explorar" aria-current="page">
              Explorar
            </a>
            <a href="#sobre">Acerca de</a>
          </nav>
          <span className="header-note">
            <span />
            Tu próxima aventura empieza aquí
          </span>
        </div>
      </header>
      <main>
        <div className="hero layout">
          <div className="hero-copy">
            <h1>
              Un mundo por <br />
              descubrir<span>.</span>
            </h1>
            <p>
              De Bulbasaur a tu próximo favorito. Explora, busca y conoce a cada
              Pokémon.
            </p>
            <a className="primary-button" href="#explorar">
              Explorar Pokédex <ArrowDown size={18} />
            </a>
            <div className="hero-bottom">
              <div className="mini-art" aria-hidden="true">
                {[1, 4, 7].map((id) => (
                  <img
                    key={id}
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                    width="56"
                    height="56"
                    alt=""
                  />
                ))}
              </div>
              <span>
                Todos tienen una historia.
                <br />
                <strong>Encuentra la tuya.</strong>
              </span>
            </div>
          </div>
          <Carousel entries={catalog} onOpen={open} />
        </div>
        <section
          className="explore-section"
          id="explorar"
          aria-labelledby="explore-title"
        >
          <div className="layout">
            <div className="section-heading">
              <div>
                <h2 id="explore-title">Encuentra tu Pokémon</h2>
                <p>Por nombre, número o el lugar donde empezó su historia.</p>
              </div>
              {metadata && (
                <span className="catalog-count">
                  <Pokeball />
                  {new Intl.NumberFormat("es").format(metadata.total)} Pokémon
                </span>
              )}
            </div>
            <motion.form
              className="search-panel"
              onSubmit={submit}
              initial={{ opacity: 1, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              role="search"
            >
              <div className="search-row">
                <label className="search-field">
                  <Search size={22} aria-hidden="true" />
                  <span className="sr-only">
                    Nombre o número nacional del Pokémon
                  </span>
                  <input
                    ref={searchRef}
                    aria-label="Nombre o número nacional del Pokémon"
                    name="pokemon"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nombre o número: Pikachu, 25…"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={80}
                    aria-keyshortcuts="/"
                  />
                  {input && (
                    <button
                      type="button"
                      className="icon-button clear-search"
                      aria-label="Borrar búsqueda"
                      onClick={() => {
                        setInput("");
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                  <kbd>/</kbd>
                </label>
                <button className="primary-button" type="submit">
                  Buscar <ArrowRight size={18} />
                </button>
              </div>
              <div className="filter-row">
                <span className="filter-caption">
                  <SlidersHorizontal size={17} />
                  Filtrar por
                </span>
                <label>
                  <span>Región de origen</span>
                  <select
                    aria-label="Región de origen"
                    name="region"
                    value={filters.region}
                    disabled={!metadata}
                    onChange={(e) =>
                      update({ ...filters, region: e.target.value, page: 1 })
                    }
                  >
                    <option value="">Todas las regiones</option>
                    {metadata?.regions.map((region) => (
                      <option value={region} key={region}>
                        {displayName(region)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Generación</span>
                  <select
                    aria-label="Generación"
                    name="generation"
                    value={filters.generation}
                    disabled={!metadata}
                    onChange={(e) =>
                      update({
                        ...filters,
                        generation: e.target.value,
                        page: 1,
                      })
                    }
                  >
                    <option value="">Todas las generaciones</option>
                    {metadata?.generations.map((g) => (
                      <option value={g.id} key={g.id}>
                        Generación {roman(g.id)}
                      </option>
                    ))}
                  </select>
                </label>
                {active && (
                  <button
                    className="reset-button"
                    type="button"
                    onClick={reset}
                  >
                    <RotateCcw size={15} />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </motion.form>
            {catalogError && (
              <div className="inline-error" role="alert">
                <span>{catalogError}</span>
                <button onClick={() => setRetry((r) => r + 1)}>
                  Reintentar
                </button>
              </div>
            )}
            <div className="results-heading">
              <h3>
                {active ? "Resultados de búsqueda" : "La colección completa"}
                <span aria-live="polite">
                  {!loading && page && !error
                    ? ` / ${new Intl.NumberFormat("es").format(page.total)}`
                    : ""}
                </span>
              </h3>
              <span>Orden: número nacional</span>
            </div>
            <div className="results" aria-busy={loading}>
              {loading ? (
                <Loader />
              ) : error ? (
                <div className="empty-state" role="alert">
                  <Pokeball />
                  <h3>La conexión se ha escapado</h3>
                  <p>{error}</p>
                  <button
                    className="primary-button"
                    onClick={() => setRetry((r) => r + 1)}
                  >
                    <RotateCcw size={17} />
                    Volver a intentar
                  </button>
                </div>
              ) : page?.results.length ? (
                <div className="pokemon-grid">
                  {page.results.map((pokemon, index) => (
                    <PokemonCard
                      key={pokemon.id}
                      pokemon={pokemon}
                      index={index}
                      onOpen={open}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={42} />
                  <h3>No encontramos ese Pokémon</h3>
                  <p>
                    Prueba otro nombre o número, o quita algún filtro para
                    ampliar la búsqueda.
                  </p>
                  <button className="primary-button" onClick={reset}>
                    Ver todos los Pokémon <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
            {!loading && !error && page && page.total > 0 && (
              <nav className="pagination" aria-label="Páginas de Pokémon">
                <span>
                  {Math.min(page.offset + 1, page.total)}–
                  {Math.min(page.offset + 12, page.total)} de{" "}
                  {new Intl.NumberFormat("es").format(page.total)}
                </span>
                <div>
                  <button
                    className="page-button"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      update({ ...filters, page: filters.page - 1 })
                    }
                  >
                    <ChevronLeft size={18} />
                    <span>Anterior</span>
                  </button>
                  <span className="page-number" aria-live="polite">
                    {filters.page} <span>/ {pages}</span>
                  </span>
                  <button
                    className="page-button"
                    disabled={filters.page >= pages}
                    onClick={() =>
                      update({ ...filters, page: filters.page + 1 })
                    }
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </nav>
            )}
          </div>
        </section>
      </main>
      <footer id="sobre" className="layout">
        <div>
          <a className="brand" href="/">
            <Pokeball />
            <span>pokédex.</span>
          </a>
          <p>Una pequeña enciclopedia para una gran aventura.</p>
        </div>
        <div className="footer-details">
          <p>
            Datos e ilustraciones de{" "}
            <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
              PokéAPI <ArrowUpRightIcon />
            </a>
          </p>
          <p>Catálogo nacional · Especies en su forma principal</p>
          <p>
            Proyecto educativo no oficial. Pokémon © Nintendo / Creatures / GAME
            FREAK.
          </p>
        </div>
      </footer>
      <PokemonDialog pokemon={selected} onClose={close} />
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight className="external-arrow" size={13} />;
}
