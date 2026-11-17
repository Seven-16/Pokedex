export interface CatalogEntry {
  id: number;
  name: string;
  generation: number;
  region: string;
  image: string;
}
export interface Pokemon extends CatalogEntry {
  types: string[];
  description: string;
  height: number;
  weight: number;
  stats: Record<string, number>;
}
export interface PokemonPage {
  total: number;
  offset: number;
  limit: number;
  results: Pokemon[];
}
export interface Metadata {
  total: number;
  generations: { id: number; name: string; region: string }[];
  regions: string[];
}
const base = import.meta.env.VITE_API_URL || "/api/v1";
export async function request<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
      : AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "No pudimos cargar los Pokémon. Inténtalo de nuevo.",
    );
  }
  return response.json();
}
export const displayName = (name: string) =>
  ({
    "nidoran-f": "Nidoran ♀",
    "nidoran-m": "Nidoran ♂",
    "mr-mime": "Mr. Mime",
    "mime-jr": "Mime Jr.",
    "type-null": "Código Cero",
    farfetchd: "Farfetch’d",
    sirfetchd: "Sirfetch’d",
  })[name] ||
  name
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
export const roman = (n: number) =>
  ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ||
  String(n);
export const number = (id: number) => `#${String(id).padStart(4, "0")}`;
export const typeNames: Record<string, string> = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  electric: "Eléctrico",
  grass: "Planta",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada",
};
