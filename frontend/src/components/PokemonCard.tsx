import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { displayName, number, roman, type PokemonSummary } from "../api";
import { PokemonImage, Types } from "./PokemonImage";

export function PokemonCard({
  pokemon,
  onOpen,
  index,
}: {
  pokemon: PokemonSummary;
  onOpen: (pokemon: PokemonSummary) => void;
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

