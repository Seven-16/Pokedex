import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { displayName, number, request, roman, type Pokemon, type PokemonSummary } from "../api";
import { PokemonImage, Types } from "./PokemonImage";

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
  pokemon: PokemonSummary | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Pokemon | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!pokemon) return;
    const controller = new AbortController();
    setDetail(null);
    setError(false);
    request<Pokemon>(`/pokemon/${pokemon.id}`, controller.signal)
      .then(setDetail)
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [pokemon?.id, retry]);
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
          {pokemon && detail?.id !== pokemon.id && (
            <div className="dialog-body" role="status">
              <Dialog.Title>{displayName(pokemon.name)}</Dialog.Title>
              <Dialog.Description id="pokemon-description">
                {error ? "No pudimos cargar la ficha. Inténtalo de nuevo." : "Cargando ficha…"}
              </Dialog.Description>
              {error && <button className="primary-button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>}
            </div>
          )}
          {pokemon && detail?.id === pokemon.id && (
            <>
              <div className="dialog-art">
                <span className="dex-number">{number(pokemon.id)}</span>
                <PokemonImage entry={pokemon} priority />
              </div>
              <div className="dialog-body">
                <Dialog.Title>{displayName(pokemon.name)}</Dialog.Title>
                <Types types={pokemon.types} />
                <Dialog.Description id="pokemon-description">
                  {detail.description}
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
                      {new Intl.NumberFormat("es").format(detail.height)} m
                    </dd>
                  </div>
                  <div>
                    <dt>Peso</dt>
                    <dd>
                      {new Intl.NumberFormat("es").format(detail.weight)} kg
                    </dd>
                  </div>
                </dl>
                <h3>Estadísticas base</h3>
                <div className="stats">
                  {Object.entries(detail.stats).map(([key, value]) => (
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

