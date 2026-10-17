import { useMemo, useState } from "react";
import {
  Network,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  Users,
  Check,
  Sparkles,
} from "lucide-react";
import { PageHeading, Empty } from "./ui";
import {
  POINTS,
  type Person,
  type Point,
  type Settings,
  type AspectSetting,
} from "../types";
import { aspects, positions } from "../astro";
import AspectTable from "./AspectTable";
import Wheel from "./Wheel";
export function AspectOptions({
  rules,
  onChange,
}: {
  rules: AspectSetting[];
  onChange: (rules: AspectSetting[]) => void;
}) {
  return (
    <div className="aspect-options">
      {rules.map((r, i) => (
        <div className="aspect-option" key={r.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) =>
                onChange(
                  rules.map((a, j) =>
                    j === i ? { ...a, enabled: e.target.checked } : a,
                  ),
                )
              }
            />
            <span className={`aspect-symbol ${r.id}`}>{r.symbol}</span>
            {r.label} <small>{r.angle}°</small>
          </label>
          <label className="orb-input">
            <input
              aria-label={`Орбис: ${r.label}`}
              type="number"
              min="0"
              max="15"
              step="0.1"
              value={r.orb}
              onChange={(e) =>
                onChange(
                  rules.map((a, j) =>
                    j === i
                      ? {
                          ...a,
                          orb: Math.min(
                            15,
                            Math.max(0, Number(e.target.value)),
                          ),
                        }
                      : a,
                  ),
                )
              }
            />{" "}
            °
          </label>
        </div>
      ))}
    </div>
  );
}
export default function Compare({
  people,
  settings,
  initialId,
  onAdd,
}: {
  people: Person[];
  settings: Settings;
  initialId: string;
  onAdd: () => void;
}) {
  const [baseId, setBaseId] = useState(
      people.some((p) => p.id === initialId) ? initialId : people[0]?.id || "",
    ),
    [chosen, setChosen] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [group, setGroup] = useState("");
  const [points, setPoints] = useState<Point[]>(POINTS.map((p) => p[0])),
    [rules, setRules] = useState(settings.aspects),
    [conditional, setConditional] = useState(false),
    [review, setReview] = useState(false),
    [compared, setCompared] = useState(false),
    [view, setView] = useState("pairs");
  const [personFilter, setPersonFilter] = useState(""),
    [pointFilter, setPointFilter] = useState(""),
    [aspectFilter, setAspectFilter] = useState(""),
    [maxOrb, setMaxOrb] = useState(15);
  const base = people.find((p) => p.id === baseId),
    others = people.filter((p) => p.id !== baseId),
    filtered = others.filter(
      (p) =>
        (!group || p.group === group) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    );
  const selected = others.filter((p) => chosen.includes(p.id));
  const results = useMemo(
    () =>
      !compared || !base
        ? []
        : selected
            .flatMap((other) =>
              aspects(positions(base), positions(other), rules, {
                points,
                conditional,
                review,
              }).map((r) => ({ ...r, personA: base, personB: other })),
            )
            .sort((a, b) => a.orb - b.orb),
    [base, selected, rules, points, conditional, review, compared],
  );
  const visible = results.filter(
    (r) =>
      (!personFilter || r.personB.id === personFilter) &&
      (!pointFilter ||
        r.a.point === pointFilter ||
        r.b.point === pointFilter) &&
      (!aspectFilter || r.aspect.id === aspectFilter) &&
      r.orb <= maxOrb + 1e-10,
  );
  const change = () => setCompared(false);
  return (
    <>
      <PageHeading
        eyebrow="ЕДИН ЧОВЕК. МНОГО ВРЪЗКИ."
        title="Сравнение"
        description="Открийте аспектите между един човек и избраните от вас близки."
      />
      {people.length < 2 ? (
        <div className="panel">
          <Empty
            icon={<Network size={34} />}
            title="Всяка връзка започва с двама"
            action={
              <button className="button primary" onClick={onAdd}>
                Добави човек
              </button>
            }
          >
            Добавете поне двама души с изчислени или ръчно въведени позиции, за
            да сравните техните карти.
          </Empty>
        </div>
      ) : (
        <>
          <section className="panel comparison-setup">
            <div className="comparison-columns">
              <div className="base-selector">
                <span className="section-label">
                  <span className="number-circle">1</span> ОСНОВЕН ЧОВЕК
                </span>
                <label className="field">
                  Чия карта разглеждаме?
                  <select
                    value={baseId}
                    onChange={(e) => {
                      setBaseId(e.target.value);
                      setChosen((ids) =>
                        ids.filter((id) => id !== e.target.value),
                      );
                      change();
                    }}
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {base && (
                  <div className="selected-person">
                    <div className="avatar">{base.name[0]}</div>
                    <div>
                      <strong>{base.name}</strong>
                      <small>{base.relationship || "Основен човек"}</small>
                      <span className="status-tag">
                        {
                          positions(base).filter((p) => p.longitude != null)
                            .length
                        }{" "}
                        налични позиции
                      </span>
                    </div>
                    <Check size={18} />
                  </div>
                )}
                <p className="fine-print">
                  Всяка избрана точка ще бъде сравнена с всяка точка на всеки
                  отбелязан човек.
                </p>
              </div>
              <div className="comparison-arrow">
                <ArrowRight size={22} />
              </div>
              <div className="others-selector">
                <div className="section-label">
                  <span className="number-circle">2</span> С КОГО СРАВНЯВАМЕ?{" "}
                  <span className="count-pill">{selected.length}</span>
                </div>
                <div className="selection-search">
                  <div className="input-icon">
                    <Search size={16} />
                    <input
                      placeholder="Потърсете близък…"
                      aria-label="Търси сред останалите хора"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label="Група за сравнение"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="">Всички групи</option>
                    {[
                      ...new Set(others.map((p) => p.group).filter(Boolean)),
                    ].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="selection-links">
                  <button
                    className="text-button"
                    onClick={() => {
                      setChosen((ids) => [
                        ...new Set([...ids, ...filtered.map((p) => p.id)]),
                      ]);
                      change();
                    }}
                  >
                    Избери всички
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setChosen([]);
                      change();
                    }}
                  >
                    Изчисти избора
                  </button>
                </div>
                <div className="person-checks">
                  {filtered.map((p) => (
                    <label
                      className={`person-check ${chosen.includes(p.id) ? "selected" : ""}`}
                      key={p.id}
                    >
                      <input
                        type="checkbox"
                        checked={chosen.includes(p.id)}
                        onChange={(e) => {
                          setChosen((ids) =>
                            e.target.checked
                              ? [...ids, p.id]
                              : ids.filter((id) => id !== p.id),
                          );
                          change();
                        }}
                      />
                      <span className="avatar mini">{p.name[0]}</span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.relationship || p.group || "Личен профил"}
                        </small>
                      </span>
                      {p.stale && (
                        <span className="status-tag warning">
                          Нужна е нова карта
                        </span>
                      )}
                    </label>
                  ))}
                  {!filtered.length && (
                    <p className="fine-print">Няма хора за тези филтри.</p>
                  )}
                </div>
              </div>
            </div>
            <details className="comparison-options">
              <summary>
                <SlidersHorizontal size={16} /> Точки, аспекти и орбиси{" "}
                <ChevronDown size={16} />
              </summary>
              <div className="options-body">
                <h3>Планети и точки</h3>
                <div className="selection-links">
                  <button
                    className="text-button"
                    onClick={() => {
                      setPoints(POINTS.map((p) => p[0]));
                      change();
                    }}
                  >
                    Всички точки
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPoints([]);
                      change();
                    }}
                  >
                    Изчисти точките
                  </button>
                </div>
                <div className="point-checkboxes">
                  {POINTS.map(([id, name, glyph]) => (
                    <label className="check" key={id}>
                      <input
                        type="checkbox"
                        checked={points.includes(id)}
                        onChange={(e) => {
                          setPoints((ps) =>
                            e.target.checked
                              ? [...ps, id]
                              : ps.filter((p) => p !== id),
                          );
                          change();
                        }}
                      />
                      {glyph} {name}
                    </label>
                  ))}
                </div>
                <h3>Основни аспекти</h3>
                <AspectOptions
                  rules={rules}
                  onChange={(r) => {
                    setRules(r);
                    change();
                  }}
                />
                <div className="inline-options">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={conditional}
                      onChange={(e) => {
                        setConditional(e.target.checked);
                        change();
                      }}
                    />{" "}
                    Включи условните позиции при неизвестен час
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={review}
                      onChange={(e) => {
                        setReview(e.target.checked);
                        change();
                      }}
                    />{" "}
                    Включи позициите „За проверка“
                  </label>
                </div>
              </div>
            </details>
            <div className="comparison-bottom">
              <span>
                <ShieldLabel /> Без оценки и психологически заключения
              </span>
              <button
                className="button primary"
                disabled={
                  !selected.length ||
                  !points.length ||
                  !rules.some((r) => r.enabled)
                }
                onClick={() => {
                  setCompared(true);
                  setPersonFilter("");
                  setPointFilter("");
                  setAspectFilter("");
                  setMaxOrb(15);
                }}
              >
                <Sparkles size={17} /> Сравни{" "}
                {selected.length
                  ? `с ${selected.length} ${selected.length === 1 ? "човек" : "души"}`
                  : ""}
              </button>
            </div>
          </section>
          {compared && base ? (
            <section className="comparison-results">
              <div className="section-heading">
                <h2>
                  Вашите звездни връзки{" "}
                  <span className="count-pill">{results.length}</span>
                </h2>
                <div className="segmented">
                  <button
                    className={view === "pairs" ? "active" : ""}
                    onClick={() => setView("pairs")}
                  >
                    По хора
                  </button>
                  <button
                    className={view === "all" ? "active" : ""}
                    onClick={() => setView("all")}
                  >
                    Всички резултати
                  </button>
                </div>
              </div>
              <div className="result-filters">
                <select
                  aria-label="Филтър по човек"
                  value={personFilter}
                  onChange={(e) => setPersonFilter(e.target.value)}
                >
                  <option value="">Всички хора</option>
                  {selected.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Филтър по точка"
                  value={pointFilter}
                  onChange={(e) => setPointFilter(e.target.value)}
                >
                  <option value="">Всички точки</option>
                  {POINTS.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Филтър по аспект"
                  value={aspectFilter}
                  onChange={(e) => setAspectFilter(e.target.value)}
                >
                  <option value="">Всички аспекти</option>
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <label className="orb-filter">
                  Макс. орбис{" "}
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.1"
                    value={maxOrb}
                    onChange={(e) =>
                      setMaxOrb(
                        Math.min(15, Math.max(0, Number(e.target.value))),
                      )
                    }
                  />
                  °
                </label>
              </div>
              {view === "all" ? (
                <div className="panel">
                  <AspectTable rows={visible} showPeople />
                </div>
              ) : (
                selected
                  .filter((p) => !personFilter || p.id === personFilter)
                  .map((p, i) => (
                    <details
                      className="pair-section panel"
                      key={p.id}
                      open={i === 0}
                    >
                      <summary>
                        <div className="pair-avatars">
                          <span className="avatar mini">{base.name[0]}</span>
                          <span className="avatar mini gold">{p.name[0]}</span>
                        </div>
                        <h3>
                          {base.name}
                          <span> × </span>
                          {p.name}
                        </h3>
                        <span className="count-pill">
                          {visible.filter((r) => r.personB.id === p.id).length}{" "}
                          аспекта
                        </span>
                        <ChevronDown size={18} />
                      </summary>
                      <AspectTable
                        rows={visible.filter((r) => r.personB.id === p.id)}
                      />
                      {positions(base).some((p) => p.longitude != null) &&
                      positions(p).some((p) => p.longitude != null) ? (
                        <details className="synastry">
                          <summary>Синастрия · двоен кръг</summary>
                          <Wheel person={base} other={p} rules={rules} />
                        </details>
                      ) : (
                        <p className="notice">
                          За синастрия са нужни налични позиции и за двамата
                          души.
                        </p>
                      )}
                    </details>
                  ))
              )}
            </section>
          ) : (
            <div className="comparison-placeholder">
              <Network size={27} />
              <p>
                Изберете хората и натиснете „Сравни“.
                <br />
                <small>
                  Тук ще се появят действителните аспекти между картите им.
                </small>
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
function ShieldLabel() {
  return <Users size={15} />;
}
