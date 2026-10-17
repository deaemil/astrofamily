export const POINTS = [
  ["sun", "Слънце", "☉"],
  ["moon", "Луна", "☽"],
  ["mercury", "Меркурий", "☿"],
  ["venus", "Венера", "♀"],
  ["mars", "Марс", "♂"],
  ["jupiter", "Юпитер", "♃"],
  ["saturn", "Сатурн", "♄"],
  ["uranus", "Уран", "♅"],
  ["neptune", "Нептун", "♆"],
  ["pluto", "Плутон", "♇"],
  ["chiron", "Хирон", "⚷"],
  ["lilith", "Лилит", "⚸"],
  ["northNode", "Северен възел", "☊"],
  ["southNode", "Южен възел", "☋"],
  ["asc", "Асцендент", "ASC"],
  ["dsc", "Десцендент", "DSC"],
  ["mc", "Медиум цели", "MC"],
  ["ic", "Имум цели", "IC"],
  ["vertex", "Вертекс", "Vx"],
  ["fortune", "Фортуна", "⊗"],
] as const;
export type Point = (typeof POINTS)[number][0];
export const SIGNS = [
  "Овен",
  "Телец",
  "Близнаци",
  "Рак",
  "Лъв",
  "Дева",
  "Везни",
  "Скорпион",
  "Стрелец",
  "Козирог",
  "Водолей",
  "Риби",
];
export const GLYPHS = [
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",
];
export interface Position {
  point: Point;
  longitude: number | null;
  retro?: boolean | null;
  house?: number | null;
  status?: "confirmed" | "review";
  approximate?: boolean;
  conditional?: boolean;
  source?: "calculated" | "manual";
  note?: string;
  reason?: string;
  minutesMissing?: boolean;
}
export interface Birth {
  date: string;
  time: string;
  accuracy: "exact" | "approximate" | "unknown";
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  offset: number | null;
}
export interface CalcSettings {
  houses: "P" | "W" | "E";
  node: "true" | "mean";
}
export interface Chart {
  positions: Position[];
  cusps: number[];
  settings: CalcSettings;
  timezone: string;
  utc: string;
  utcOffset: number;
  julianDay: number;
  moonRange: number[] | null;
  warnings: string[];
  engine: string;
  lilithType: string;
  zodiac: string;
  center: string;
}
export interface Person {
  id: string;
  name: string;
  relationship: string;
  group: string;
  notes: string;
  mode: "manual" | "automatic";
  birth: Birth | null;
  chart: Chart | null;
  overrides: Position[];
  stale: boolean;
  updatedAt: string;
}
export interface AspectSetting {
  id: string;
  label: string;
  angle: number;
  orb: number;
  enabled: boolean;
  symbol: string;
}
export const DEFAULT_ASPECTS: AspectSetting[] = [
  {
    id: "conjunction",
    label: "Съвпад",
    angle: 0,
    orb: 3,
    enabled: true,
    symbol: "☌",
  },
  {
    id: "sextile",
    label: "Секстил",
    angle: 60,
    orb: 3,
    enabled: true,
    symbol: "⚹",
  },
  {
    id: "square",
    label: "Квадратура",
    angle: 90,
    orb: 3,
    enabled: true,
    symbol: "□",
  },
  {
    id: "trine",
    label: "Тригон",
    angle: 120,
    orb: 3,
    enabled: true,
    symbol: "△",
  },
  {
    id: "opposition",
    label: "Опозиция",
    angle: 180,
    orb: 3,
    enabled: true,
    symbol: "☍",
  },
];
export interface Settings extends CalcSettings {
  aspects: AspectSetting[];
}
export interface AtlasData {
  version: 1;
  people: Person[];
  settings: Settings;
}
export const EMPTY: AtlasData = {
  version: 1,
  people: [],
  settings: { houses: "P", node: "true", aspects: DEFAULT_ASPECTS },
};
export interface AspectResult {
  a: Position;
  b: Position;
  aspect: AspectSetting;
  distance: number;
  orb: number;
  approximate: boolean;
  personA?: Person;
  personB?: Person;
}
export const pointName = (id: string) =>
  POINTS.find((p) => p[0] === id)?.[1] || id;
export const pointGlyph = (id: string) =>
  POINTS.find((p) => p[0] === id)?.[2] || id;
