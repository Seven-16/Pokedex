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

