import {
  DEFAULT_ASPECTS,
  POINTS,
  SIGNS,
  type AspectResult,
  type AspectSetting,
  type AtlasData,
  type Person,
  type Point,
  type Position,
} from "./types";
export const normalize = (v: number) => ((v % 360) + 360) % 360;
export function distance(a: number, b: number) {
  const d = Math.abs(normalize(a) - normalize(b));
  return Math.min(d, 360 - d);
}
export function formatArc(value: number) {
  const m = Math.round(Math.abs(value) * 60);
  return `${Math.floor(m / 60)}° ${String(m % 60).padStart(2, "0")}′`;
}
export function formatPosition(p: Position | number | null | undefined) {
  const lon = typeof p === "number" ? p : p?.longitude;
  if (lon == null) return "Не е налична";
  const total = Math.round(normalize(lon) * 60) % 21600;
  return `${SIGNS[Math.floor(total / 1800)]} ${Math.floor((total % 1800) / 60)}° ${String(total % 60).padStart(2, "0")}′`;
}
export function positions(person: Person): Position[] {
  const base = person.stale ? [] : person.chart?.positions || [];
  let merged = POINTS.map(
    ([point]) =>
      person.overrides.find((p) => p.point === point) ||
      base.find((p) => p.point === point),
  ).filter((p): p is Position => !!p);
  if (person.mode === "automatic" && person.birth?.accuracy === "unknown")
    merged = merged
      .filter(
        (p) =>
          !["asc", "dsc", "mc", "ic", "vertex", "fortune"].includes(p.point),
      )
      .map((p) => ({
        ...p,
        conditional: true,
        approximate: true,
        house: null,
      }));
  else if (
    person.mode === "automatic" &&
    person.birth?.accuracy === "approximate"
  )
    merged = merged.map((p) => ({ ...p, approximate: true }));
  return merged;
}
export function usable(
  p: Position,
  includeConditional = false,
  includeReview = false,
) {
  return (
    p.longitude != null &&
    Number.isFinite(p.longitude) &&
    (includeConditional || !p.conditional) &&
    (includeReview || p.status !== "review")
  );
}
export function aspects(
  a: Position[],
  b: Position[],
  rules: AspectSetting[] = DEFAULT_ASPECTS,
  options: {
    same?: boolean;
    conditional?: boolean;
    review?: boolean;
    points?: Point[];
  } = {},
): AspectResult[] {
  const results: AspectResult[] = [];
  a.forEach((pa, i) =>
    b.forEach((pb, j) => {
      if (options.same && j <= i) return;
      if (
        !usable(pa, options.conditional, options.review) ||
        !usable(pb, options.conditional, options.review)
      )
        return;
      if (
        options.points &&
        (!options.points.includes(pa.point) ||
          !options.points.includes(pb.point))
      )
        return;
      const d = distance(pa.longitude!, pb.longitude!);
      rules
        .filter((r) => r.enabled)
        .forEach((r) => {
          const orb = Math.abs(d - r.angle);
          if (orb <= r.orb + 1e-10)
            results.push({
              a: pa,
              b: pb,
              aspect: r,
              distance: d,
              orb,
              approximate: !!(
                pa.approximate ||
                pb.approximate ||
                pa.conditional ||
                pb.conditional
              ),
            });
        });
    }),
  );
  return results.sort((x, y) => x.orb - y.orb);
}
export function manualPosition(
  point: Point,
  sign: string,
  degree: string,
  minute: string,
  retro: string,
  house: string,
  status: "confirmed" | "review",
  note: string,
): Position | null {
  if (degree.trim() === "") return null;
  const s = Number(sign),
    d = Number(degree),
    m = minute.trim() === "" ? 0 : Number(minute),
    h = house === "" ? null : Number(house);
  if (
    !Number.isInteger(s) ||
    s < 0 ||
    s > 11 ||
    !Number.isInteger(d) ||
    d < 0 ||
    d > 29 ||
    !Number.isInteger(m) ||
    m < 0 ||
    m > 59 ||
    (h !== null && (!Number.isInteger(h) || h < 1 || h > 12))
  )
    throw new Error(
      "Проверете знака, градусите (0–29), минутите (0–59) и дома (1–12).",
    );
  return {
    point,
    longitude: s * 30 + d + m / 60,
    retro: retro === "unknown" ? null : retro === "yes",
    house: h,
    status,
    note,
    source: "manual",
    approximate: minute.trim() === "",
    minutesMissing: minute.trim() === "",
  };
}
export function validateBackup(raw: unknown): AtlasData {
  try {
    return checkBackup(raw);
  } catch {
    throw new Error(
      "Невалиден архив на Астро Атлас. Данните не бяха променени.",
    );
  }
}
function checkBackup(raw: unknown): AtlasData {
  const fail = () => {
    throw new Error(
      "Невалиден архив на Астро Атлас. Данните не бяха променени.",
    );
  };
  if (!raw || typeof raw !== "object") return fail();
  const x = raw as AtlasData;
  if (
    x.version !== 1 ||
    !Array.isArray(x.people) ||
    x.people.length > 10000 ||
    !x.settings ||
    !["P", "W", "E"].includes(x.settings.houses) ||
    !["true", "mean"].includes(x.settings.node) ||
    !Array.isArray(x.settings.aspects) ||
    x.settings.aspects.length !== 5
  )
    return fail();
  if (new Set(x.people.map((p) => p.id)).size !== x.people.length)
    return fail();
  const validPositions = (ps: Position[]) =>
    Array.isArray(ps) &&
    ps.length <= POINTS.length &&
    new Set(ps.map((p) => p.point)).size === ps.length &&
    ps.every(
      (p) =>
        POINTS.some((t) => t[0] === p.point) &&
        (p.longitude === null ||
          (typeof p.longitude === "number" &&
            Number.isFinite(p.longitude) &&
            p.longitude >= 0 &&
            p.longitude < 360)) &&
        (p.house == null ||
          (Number.isInteger(p.house) && p.house >= 1 && p.house <= 12)) &&
        (!p.status || ["confirmed", "review"].includes(p.status)) &&
        (p.retro == null || typeof p.retro === "boolean") &&
        (!p.source || ["manual", "calculated"].includes(p.source)) &&
        [p.approximate, p.conditional, p.minutesMissing].every(
          (v) => v === undefined || typeof v === "boolean",
        ) &&
        [p.note, p.reason].every(
          (v) => v === undefined || typeof v === "string",
        ),
    );
  for (const p of x.people) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 200 ||
      !["manual", "automatic"].includes(p.mode) ||
      typeof p.group !== "string" ||
      typeof p.relationship !== "string" ||
      typeof p.notes !== "string" ||
      typeof p.stale !== "boolean" ||
      typeof p.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(p.updatedAt)) ||
      !validPositions(p.overrides)
    )
      return fail();
    if (
      p.birth &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(p.birth.date) ||
        !["exact", "approximate", "unknown"].includes(p.birth.accuracy) ||
        !Number.isFinite(p.birth.lat) ||
        Math.abs(p.birth.lat) > 90 ||
        !Number.isFinite(p.birth.lon) ||
        Math.abs(p.birth.lon) > 180 ||
        typeof p.birth.timezone !== "string" ||
        typeof p.birth.city !== "string" ||
        typeof p.birth.time !== "string" ||
        (p.birth.offset !== null &&
          (!Number.isInteger(p.birth.offset) ||
            Math.abs(p.birth.offset) > 840)))
    )
      return fail();
    if (
      p.chart &&
      (!validPositions(p.chart.positions) ||
        !Array.isArray(p.chart.cusps) ||
        ![0, 12].includes(p.chart.cusps.length) ||
        !p.chart.cusps.every((n) => Number.isFinite(n) && n >= 0 && n < 360) ||
        !p.chart.settings ||
        !["P", "W", "E"].includes(p.chart.settings.houses) ||
        !["true", "mean"].includes(p.chart.settings.node) ||
        !Array.isArray(p.chart.warnings) ||
        !p.chart.warnings.every((w) => typeof w === "string") ||
        ![
          p.chart.timezone,
          p.chart.utc,
          p.chart.engine,
          p.chart.lilithType,
          p.chart.zodiac,
          p.chart.center,
        ].every((v) => typeof v === "string") ||
        !Number.isFinite(p.chart.julianDay) ||
        !Number.isFinite(p.chart.utcOffset) ||
        (p.chart.moonRange !== null &&
          (!Array.isArray(p.chart.moonRange) ||
            p.chart.moonRange.length !== 2 ||
            !p.chart.moonRange.every(
              (v) => Number.isFinite(v) && v >= 0 && v < 360,
            ))))
    )
      return fail();
  }
  if (
    x.settings.aspects.some(
      (a, i) =>
        !DEFAULT_ASPECTS.some((d) => d.id === a.id && d.angle === a.angle) ||
        x.settings.aspects.findIndex((r) => r.id === a.id) !== i ||
        !Number.isFinite(a.orb) ||
        a.orb < 0 ||
        a.orb > 15 ||
        typeof a.enabled !== "boolean",
    )
  )
    return fail();
  return x;
}
export function download(filename: string, body: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
