import { useMemo, useState } from "react";
import { Orbit, Users, Check } from "lucide-react";
import { PageHeading, Empty } from "./ui";
import { POINTS, SIGNS, pointName, type Person, type Position } from "../types";
import {
  distance,
  formatArc,
  formatPosition,
  positions,
  usable,
} from "../astro";
export default function Repeats({
  people,
  onAdd,
}: {
  people: Person[];
  onAdd: () => void;
}) {
  const [selected, setSelected] = useState(people.map((p) => p.id)),
    [point, setPoint] = useState(""),
    [sign, setSign] = useState(""),
    [house, setHouse] = useState(""),
    [orb, setOrb] = useState(3),
    [mode, setMode] = useState("sign"),
    [conditional, setConditional] = useState(false);
  const rows = useMemo(
    () =>
      people
        .filter((p) => selected.includes(p.id))
        .flatMap((person) =>
          positions(person)
            .filter(
              (p) =>
                usable(p, conditional, false) &&
                (!point || p.point === point) &&
                (!sign || Math.floor(p.longitude! / 30) === Number(sign)) &&
                (!house ||
                  (p.house === Number(house) &&
                    !p.approximate &&
                    !p.conditional)),
            )
            .map((p) => ({ person, p })),
        ),
    [people, selected, point, sign, house, conditional],
  );
  const groups = Object.values(
    rows.reduce<
      Record<
        string,
        {
          point: string;
          sign: number;
          items: { person: Person; p: Position }[];
        }
      >
    >((acc, row) => {
      const s = Math.floor(row.p.longitude! / 30),
        key = row.p.point + "-" + s;
      acc[key] ||= { point: row.p.point, sign: s, items: [] };
      acc[key].items.push(row);
      return acc;
    }, {}),
  ).filter((g) => g.items.length >= 2 || (point && sign));
  const closePairs = rows
    .flatMap((a, i) =>
      rows
        .slice(i + 1)
        .filter(
          (b) =>
            a.person.id !== b.person.id &&
            a.p.point === b.p.point &&
            distance(a.p.longitude!, b.p.longitude!) <= orb + 1e-10,
        )
        .map((b) => ({ a, b, d: distance(a.p.longitude!, b.p.longitude!) })),
    )
    .sort((a, b) => a.d - b.d);
  return (
    <>
      <PageHeading
        eyebrow="ОБЩИТЕ НИ ЗВЕЗДНИ НИШКИ"
        title="Повторения"
        description="Вижте кои позиции се повтарят сред вашите хора — по знак или по градуси."
      />
      {!people.length ? (
        <div className="panel">
          <Empty
            icon={<Orbit size={34} />}
            title="Семейните нишки предстоят"
            action={
              <button className="button primary" onClick={onAdd}>
                Добави първия човек
              </button>
            }
          >
            Добавете хора и техните позиции, за да откриете повторенията между
            картите им.
          </Empty>
        </div>
      ) : (
        <>
          <div className="panel repeats-controls">
            <div className="section-heading">
              <h3>
                <Users size={17} /> Изберете хора
              </h3>
              <div className="selection-links">
                <button
                  className="text-button"
                  onClick={() => setSelected(people.map((p) => p.id))}
                >
                  Всички
                </button>
                <button className="text-button" onClick={() => setSelected([])}>
                  Изчисти
                </button>
              </div>
            </div>
            <div className="person-chips">
              {people.map((p) => (
                <button
                  key={p.id}
                  className={`person-chip ${selected.includes(p.id) ? "selected" : ""}`}
                  onClick={() =>
                    setSelected((ids) =>
                      ids.includes(p.id)
                        ? ids.filter((id) => id !== p.id)
                        : [...ids, p.id],
                    )
                  }
                >
                  {selected.includes(p.id) && <Check size={14} />} {p.name}
                </button>
              ))}
            </div>
            <div className="result-filters">
              <select
                aria-label="Планета за повторения"
                value={point}
                onChange={(e) => setPoint(e.target.value)}
              >
                <option value="">Всички планети и точки</option>
                {POINTS.map(([id, n, g]) => (
                  <option key={id} value={id}>
                    {g} {n}
                  </option>
                ))}
              </select>
              <select
                aria-label="Знак за повторения"
                value={sign}
                onChange={(e) => setSign(e.target.value)}
              >
                <option value="">Всички знаци</option>
                {SIGNS.map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                aria-label="Дом за повторения"
                value={house}
                onChange={(e) => setHouse(e.target.value)}
              >
                <option value="">Всички домове</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    Дом {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={conditional}
                onChange={(e) => setConditional(e.target.checked)}
              />{" "}
              Включи условните позиции при неизвестен час
            </label>
            <p className="fine-print">
              Филтърът по дом включва само позиции без маркер за
              приблизителност. Позициите „За проверка“ са изключени.
            </p>
          </div>
          <div className="section-heading repeats-heading">
            <div className="segmented">
              <button
                className={mode === "sign" ? "active" : ""}
                onClick={() => setMode("sign")}
              >
                Еднакъв знак
              </button>
              <button
                className={mode === "degrees" ? "active" : ""}
                onClick={() => setMode("degrees")}
              >
                Съвпад по градуси
              </button>
            </div>
            {mode === "degrees" && (
              <label className="orb-filter">
                Допустим орбис{" "}
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  value={orb}
                  onChange={(e) =>
                    setOrb(Math.min(15, Math.max(0, Number(e.target.value))))
                  }
                />
                °
              </label>
            )}
          </div>
          <p className="field-help">
            {mode === "sign"
              ? "Еднаквият знак не означава съвпад по градуси. Изберете планета и знак, например Луна и Лъв, за да видите всички съответствия."
              : "Сравняваме еднакви точки между различни хора по реалното ъглово разстояние, включително през границата на знаците."}
          </p>
          {mode === "sign" ? (
            <div className="repeat-grid">
              {groups.map((g) => (
                <div key={g.point + g.sign} className="panel repeat-card">
                  <div className="section-heading">
                    <h3>
                      {pointName(g.point)} в {SIGNS[g.sign]}
                    </h3>
                    <span className="count-pill">{g.items.length} души</span>
                  </div>
                  {g.items.map(({ person, p }) => (
                    <div className="repeat-person" key={person.id}>
                      <span className="avatar mini">{person.name[0]}</span>
                      <strong>{person.name}</strong>
                      <span>
                        {formatPosition(p)}
                        {p.approximate ? " · Приблизително" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {!groups.length && (
                <div className="panel small-empty full-width">
                  Няма повторения с тези филтри. Добавете още хора или променете
                  избора.
                </div>
              )}
            </div>
          ) : (
            <div className="panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Планета / точка</th>
                      <th>Първи човек</th>
                      <th>Втори човек</th>
                      <th>Разстояние</th>
                      <th>Точност</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closePairs.map(({ a, b, d }, i) => (
                      <tr key={i}>
                        <td>{pointName(a.p.point)}</td>
                        <td>
                          <strong>{a.person.name}</strong>
                          <small>{formatPosition(a.p)}</small>
                        </td>
                        <td>
                          <strong>{b.person.name}</strong>
                          <small>{formatPosition(b.p)}</small>
                        </td>
                        <td>{formatArc(d)}</td>
                        <td>
                          {a.p.approximate || b.p.approximate
                            ? "Приблизително"
                            : "Потвърдени данни"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!closePairs.length && (
                <div className="small-empty">
                  Няма близки позиции в избрания орбис.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
