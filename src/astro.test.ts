import { describe, it, expect } from "vitest";
import {
  distance,
  aspects,
  manualPosition,
  positions,
  validateBackup,
  formatPosition,
} from "./astro";
import { DEFAULT_ASPECTS, EMPTY, type Person, type Position } from "./types";
const pos = (
  lon: number | null,
  point: Position["point"] = "sun",
  extra: Partial<Position> = {},
): Position => ({ point, longitude: lon, ...extra });
describe("геометрия и точност", () => {
  it("преминава през Риби–Овен", () => expect(distance(359, 1)).toBe(2));
  it("намира съвпад през 0°", () =>
    expect(aspects([pos(359)], [pos(1, "moon")])[0].orb).toBe(2));
  it("разграничава 0° от липсваща позиция", () => {
    expect(
      manualPosition("sun", "0", "0", "0", "no", "", "confirmed", "")!
        .longitude,
    ).toBe(0);
    expect(
      manualPosition("sun", "0", "", "", "no", "", "confirmed", ""),
    ).toBeNull();
    expect(aspects([pos(null)], [pos(0)])).toHaveLength(0);
  });
  it("включва границата на орбиса без закръгляване", () => {
    expect(aspects([pos(0)], [pos(3)])[0].orb).toBe(3);
    expect(aspects([pos(0)], [pos(3.00001)])).toHaveLength(0);
  });
  it("поддържа нулев орбис", () =>
    expect(
      aspects(
        [pos(0)],
        [pos(60)],
        DEFAULT_ASPECTS.map((r) => ({ ...r, orb: 0 })),
      )[0].aspect.angle,
    ).toBe(60));
  it("маркира липсващи минути като приблизителни", () => {
    const p = manualPosition(
      "sun",
      "0",
      "0",
      "",
      "unknown",
      "",
      "confirmed",
      "",
    )!;
    expect(p.longitude).toBe(0);
    expect(p.approximate).toBe(true);
    expect(aspects([p], [pos(0, "moon")])[0].approximate).toBe(true);
  });
  it("изключва условните и непотвърдените позиции по подразбиране", () => {
    expect(
      aspects([pos(0, "moon", { conditional: true })], [pos(0)]),
    ).toHaveLength(0);
    expect(
      aspects([pos(0, "moon", { status: "review" })], [pos(0)]),
    ).toHaveLength(0);
    expect(
      aspects(
        [pos(0, "moon", { conditional: true })],
        [pos(0)],
        DEFAULT_ASPECTS,
        { conditional: true },
      ),
    ).toHaveLength(1);
  });
  it("не дублира и не сравнява точка със себе си вътре в карта", () => {
    const ps = [pos(0), pos(1, "moon"), pos(2, "mars")];
    expect(aspects(ps, ps, DEFAULT_ASPECTS, { same: true })).toHaveLength(3);
  });
  it("сравнява всяка избрана точка с всяка друга", () => {
    expect(
      aspects([pos(0), pos(0, "moon")], [pos(0), pos(0, "mars")]),
    ).toHaveLength(4);
  });
  it("ретроградността не променя аспекта", () =>
    expect(aspects([pos(0, "sun", { retro: true })], [pos(0)])[0].orb).toBe(0));
  it("закръгля минутите с пренасяне в следващ знак", () =>
    expect(formatPosition(29.9999)).toBe("Телец 0° 00′"));
  it("проверява границите на ръчните стойности", () => {
    expect(() =>
      manualPosition("sun", "12", "1", "0", "no", "", "confirmed", ""),
    ).toThrow();
    expect(() =>
      manualPosition("sun", "0", "30", "0", "no", "", "confirmed", ""),
    ).toThrow();
    expect(() =>
      manualPosition("sun", "0", "1", "60", "no", "", "confirmed", ""),
    ).toThrow();
  });
});
describe("актуалност и архиви", () => {
  const person: Person = {
    id: "1",
    name: "Тест",
    relationship: "",
    group: "",
    notes: "",
    mode: "automatic",
    birth: null,
    chart: {
      positions: [pos(0)],
      cusps: [],
      settings: { houses: "P", node: "true" },
      timezone: "",
      utc: "",
      utcOffset: 0,
      julianDay: 0,
      moonRange: null,
      warnings: [],
      engine: "",
      lilithType: "",
      zodiac: "",
      center: "",
    },
    overrides: [],
    stale: true,
    updatedAt: "",
  };
  it("не използва остарели изчисления", () =>
    expect(positions(person)).toHaveLength(0));
  it("запазва отделно ръчните корекции", () =>
    expect(
      positions({
        ...person,
        stale: false,
        overrides: [pos(20, "sun", { source: "manual" })],
      })[0].longitude,
    ).toBe(20));
  it("възстановява оригинала при премахване на корекция", () =>
    expect(positions({ ...person, stale: false })[0].longitude).toBe(0));
  it("валидира архив след JSON roundtrip", () =>
    expect(validateBackup(JSON.parse(JSON.stringify(EMPTY)))).toEqual(EMPTY));
  it("отхвърля дублирани идентификатори", () =>
    expect(() =>
      validateBackup({ ...EMPTY, people: [person, person] }),
    ).toThrow());
  it("отхвърля невалидни орбиси и позиции", () => {
    expect(() =>
      validateBackup({
        ...EMPTY,
        settings: {
          ...EMPTY.settings,
          aspects: [
            { ...DEFAULT_ASPECTS[0], orb: -1 },
            ...DEFAULT_ASPECTS.slice(1),
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...EMPTY,
        people: [{ ...person, overrides: [pos(360)] }],
      }),
    ).toThrow();
  });
});
