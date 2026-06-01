export type DashboardMode = "qualifying" | "race";

export type GrandPrixOption = {
  slug: string;
  label: string;
  circuit: string;
};

export type DriverOption = {
  code: string;
  name: string;
  team: string;
};

export const DEFAULT_DASHBOARD_MODE: DashboardMode = "qualifying";
export const DEFAULT_YEAR = 2025;
export const DEFAULT_GRAND_PRIX = "australia";
export const DEFAULT_DRIVER = "RUS";
export const DEFAULT_SESSION = "Q";

export const GRAND_PRIX_OPTIONS: GrandPrixOption[] = [
  { slug: "australia", label: "Australia", circuit: "Albert Park Circuit" },
  { slug: "china", label: "China", circuit: "Shanghai International Circuit" },
  { slug: "japan", label: "Japan", circuit: "Suzuka Circuit" },
  { slug: "bahrain", label: "Bahrain", circuit: "Bahrain International Circuit" },
  { slug: "saudi-arabia", label: "Saudi Arabia", circuit: "Jeddah Corniche Circuit" },
  { slug: "miami", label: "Miami", circuit: "Miami International Autodrome" },
  { slug: "imola", label: "Imola", circuit: "Autodromo Enzo e Dino Ferrari" },
  { slug: "monaco", label: "Monaco", circuit: "Circuit de Monaco" },
  { slug: "spain", label: "Spain", circuit: "Circuit de Barcelona-Catalunya" },
  { slug: "canada", label: "Canada", circuit: "Circuit Gilles-Villeneuve" },
  { slug: "austria", label: "Austria", circuit: "Red Bull Ring" },
  { slug: "silverstone", label: "Silverstone", circuit: "Silverstone Circuit" },
  { slug: "belgium", label: "Belgium", circuit: "Circuit de Spa-Francorchamps" },
  { slug: "hungary", label: "Hungary", circuit: "Hungaroring" },
  { slug: "netherlands", label: "Netherlands", circuit: "Circuit Zandvoort" },
  { slug: "monza", label: "Monza", circuit: "Autodromo Nazionale Monza" },
  { slug: "azerbaijan", label: "Azerbaijan", circuit: "Baku City Circuit" },
  { slug: "singapore", label: "Singapore", circuit: "Marina Bay Street Circuit" },
  { slug: "austin", label: "Austin", circuit: "Circuit of the Americas" },
  { slug: "mexico", label: "Mexico", circuit: "Autodromo Hermanos Rodriguez" },
  { slug: "brazil", label: "Brazil", circuit: "Autodromo Jose Carlos Pace" },
  { slug: "las-vegas", label: "Las Vegas", circuit: "Las Vegas Strip Circuit" },
  { slug: "qatar", label: "Qatar", circuit: "Lusail International Circuit" },
  { slug: "abu-dhabi", label: "Abu Dhabi", circuit: "Yas Marina Circuit" },
];

export const DRIVER_OPTIONS: DriverOption[] = [
  { code: "VER", name: "Max Verstappen", team: "Red Bull Racing" },
  { code: "NOR", name: "Lando Norris", team: "McLaren" },
  { code: "PIA", name: "Oscar Piastri", team: "McLaren" },
  { code: "LEC", name: "Charles Leclerc", team: "Ferrari" },
  { code: "HAM", name: "Lewis Hamilton", team: "Ferrari" },
  { code: "RUS", name: "George Russell", team: "Mercedes" },
  { code: "ALO", name: "Fernando Alonso", team: "Aston Martin" },
  { code: "STR", name: "Lance Stroll", team: "Aston Martin" },
  { code: "TSU", name: "Yuki Tsunoda", team: "Red Bull Racing" },
  { code: "LAW", name: "Liam Lawson", team: "Racing Bulls" },
  { code: "HAD", name: "Isack Hadjar", team: "Racing Bulls" },
  { code: "GAS", name: "Pierre Gasly", team: "Alpine" },
  { code: "DOO", name: "Jack Doohan", team: "Alpine" },
  { code: "ALB", name: "Alex Albon", team: "Williams" },
  { code: "SAI", name: "Carlos Sainz", team: "Williams" },
  { code: "OCO", name: "Esteban Ocon", team: "Haas" },
  { code: "BEA", name: "Oliver Bearman", team: "Haas" },
  { code: "HUL", name: "Nico Hulkenberg", team: "Sauber" },
  { code: "BOR", name: "Gabriel Bortoleto", team: "Sauber" },
  { code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes" },
];

const TEAM_COLOR_MAP: Record<string, string> = {
  Ferrari: "#DC0000",
  McLaren: "#FF8000",
  Mercedes: "#00D2BE",
  "Red Bull Racing": "#1A2B6C",
  "Aston Martin": "#005A47",
  Alpine: "#FF6FB5",
  Williams: "#0057B8",
  Haas: "#B6BABD",
  Sauber: "#76D66B",
  "Racing Bulls": "#F5F7FA",
};

export function getGrandPrixOption(slugOrLabel: string) {
  const normalized = slugOrLabel.trim().toLowerCase();
  return (
    GRAND_PRIX_OPTIONS.find(
      (option) => option.slug === normalized || option.label.toLowerCase() === normalized,
    ) ?? GRAND_PRIX_OPTIONS[0]
  );
}

export function getDriverOption(code: string) {
  const normalized = code.trim().toUpperCase();
  return DRIVER_OPTIONS.find((option) => option.code === normalized) ?? null;
}

export function getTeamColor(team: string | null | undefined) {
  if (!team) {
    return "#8e96a3";
  }

  const normalized = team.toLowerCase();
  if (normalized.includes("ferrari")) return TEAM_COLOR_MAP.Ferrari;
  if (normalized.includes("mclaren")) return TEAM_COLOR_MAP.McLaren;
  if (normalized.includes("mercedes")) return TEAM_COLOR_MAP.Mercedes;
  if (normalized.includes("red bull")) return TEAM_COLOR_MAP["Red Bull Racing"];
  if (normalized.includes("aston martin")) return TEAM_COLOR_MAP["Aston Martin"];
  if (normalized.includes("alpine")) return TEAM_COLOR_MAP.Alpine;
  if (normalized.includes("williams")) return TEAM_COLOR_MAP.Williams;
  if (normalized.includes("haas")) return TEAM_COLOR_MAP.Haas;
  if (normalized.includes("sauber") || normalized.includes("kick")) return TEAM_COLOR_MAP.Sauber;
  if (
    normalized.includes("racing bulls") ||
    normalized.includes("visa cash app") ||
    normalized.includes("rb")
  ) {
    return TEAM_COLOR_MAP["Racing Bulls"];
  }

  return "#8e96a3";
}
