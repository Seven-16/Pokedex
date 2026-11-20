import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
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
  typeNames,
  type CatalogEntry,
  type Metadata,
  type PokemonSummary,
  type PokemonPage,
} from "./api";

type Filters = { q: string; generation: string; region: string; type: string; page: number };
const defaults: Filters = { q: "", generation: "", region: "", type: "", page: 1 };
function fromURL(): Filters {
  const params = new URLSearchParams(location.search);
  return {
    q: (params.get("q") || "").slice(0, 80),
    generation: /^[1-9]\d*$/.test(params.get("generation") || "")
      ? params.get("generation")!
      : "",
    region: params.get("region") || "",
    type: Object.hasOwn(typeNames, params.get("type") || "") ? params.get("type")! : "",
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
    if (filters.type) params.set("type", filters.type);
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
    if (
      next.q === filters.q && next.generation === filters.generation &&
      next.region === filters.region && next.type === filters.type &&
      next.page === filters.page
    ) return;
    setFilters(next);
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.generation) params.set("generation", next.generation);
    if (next.region) params.set("region", next.region);
    if (next.type) params.set("type", next.type);
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
  const active = !!(filters.q || filters.generation || filters.region || filters.type);
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
                <FilterMenu label="Región de origen" value={filters.region} disabled={!metadata}
                  options={[{ value: "", label: "Todas las regiones" }, ...(metadata?.regions.map((region) => ({ value: region, label: displayName(region) })) || [])]}
                  onChange={(region) => update({ ...filters, region, page: 1 })} />
                <FilterMenu label="Generación" value={filters.generation} disabled={!metadata}
                  options={[{ value: "", label: "Todas las generaciones" }, ...(metadata?.generations.map((g) => ({ value: String(g.id), label: `Generación ${roman(g.id)}` })) || [])]}
                  onChange={(generation) => update({ ...filters, generation, page: 1 })} />
                <FilterMenu label="Tipo" value={filters.type} typeMenu
                  options={[{ value: "", label: "Todos los tipos" }, ...Object.entries(typeNames).map(([value, label]) => ({ value, label }))]}
                  onChange={(type) => update({ ...filters, type, page: 1 })} />
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
        <section id="sobre" className="about-section" aria-labelledby="about-title">
          <div className="layout about-layout">
            <div className="about-intro">
              <h2 id="about-title">Detrás de esta Pokédex<span>.</span></h2>
              <p>Un mini proyecto personal que le di mucho cariño.</p>
            </div>
            <article className="creator-card">
              <div className="creator-portrait-wrap">
                <div className="creator-portrait">
                  <img src="/aaron-carmona.jpeg" alt="Retrato de Aarón Carmona" loading="lazy" />
                </div>
                <span className="creator-mark" aria-hidden="true"><Pokeball /></span>
              </div>
              <div className="creator-content">
                <span className="creator-role">Creador de esta Pokédex</span>
                <h3>Aarón Carmona<span>.</span></h3>
                <p>¡Hola! Soy Aarón, y esta es mi pokédex. Gracias por visualizar mi arte!</p>
                <div className="creator-contact" aria-label="Datos de contacto">
                  <a href="mailto:carmaar1216@gmail.com"><Mail size={18} aria-hidden="true" /><span><small>Correo</small>carmaar1216@gmail.com</span><ArrowUpRightIcon /></a>
                  <a href="tel:+18299933365"><Phone size={18} aria-hidden="true" /><span><small>Teléfono</small>1 (829)-993-3365</span><ArrowUpRightIcon /></a>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <footer className="layout">
        <div>
          <a className="brand" href="/">
            <Pokeball />
            <span>pokédex.</span>
          </a>
          <p>Una pequeña enciclopedia para una gran aventura.</p>
          <p className="creator-signature">Creado por <a href="https://seven-16.github.io/portafolio/">Aarón Carmona</a></p>
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

function FilterMenu({ label, value, options, onChange, disabled = false, typeMenu = false }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean; typeMenu?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className={`filter-control ${typeMenu ? "filter-control-type" : ""}`} ref={root}>
    <span className="filter-label">{label}</span>
    <button ref={trigger} type="button" className="filter-trigger" disabled={disabled} aria-label={`${label}: ${options.find((option) => option.value === value)?.label || label}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{options.find((option) => option.value === value)?.label || label}</span><ChevronDown size={15} className={open ? "chevron-open" : ""} />
    </button>
    {open && <div className={`filter-menu ${typeMenu ? "type-menu" : ""}`} aria-label={label} role="group">
      {options.map((option) => <button type="button" key={option.value} className={`filter-option ${typeMenu && option.value ? `type-option type-${option.value}` : ""} ${option.value === value ? "is-selected" : ""}`} aria-pressed={option.value === value} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}>
        {typeMenu && option.value && <i aria-hidden="true" />}<span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
