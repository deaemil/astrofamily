import { useMemo, useState } from "react";
import { POINTS, GLYPHS, type Person, type Point } from "../types";
import { aspects, formatPosition, positions, usable } from "../astro";
import {
  DEFAULT_ASPECTS,
  pointGlyph,
  pointName,
  type AspectSetting,
} from "../types";
export function CelestialArt() {
  return (
    <div className="celestial-art" aria-hidden="true">
      <svg viewBox="0 0 420 300">
        <defs>
          <radialGradient id="sky">
            <stop stopColor="#a698ba" stopOpacity=".13" />
            <stop offset="1" stopColor="#a698ba" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="225" cy="150" r="151" fill="url(#sky)" />
        {[60, 100, 137].map((r, i) => (
          <circle
            key={r}
            cx="225"
            cy="150"
            r={r}
            fill="none"
            stroke={i === 1 ? "#c8ab74" : "#afa1bb"}
            strokeOpacity=".35"
            strokeDasharray={i === 0 ? "2 6" : undefined}
          />
        ))}
        <ellipse
          cx="225"
          cy="150"
          rx="174"
          ry="54"
          fill="none"
          stroke="#bfa77e"
          strokeOpacity=".5"
          transform="rotate(-32 225 150)"
        />
        <path
          d="M112 215 168 193 190 112 260 96 314 159 279 228"
          fill="none"
          stroke="#cec1de"
          strokeOpacity=".55"
        />
        {[
          [112, 215],
          [168, 193],
          [190, 112],
          [260, 96],
          [314, 159],
          [279, 228],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={i === 2 ? 6 : 3}
              fill={i === 2 ? "#dfc18e" : "#d5c9e3"}
            />
            <circle
              cx={x}
              cy={y}
              r={i === 2 ? 12 : 6}
              fill="none"
              stroke="#c8b8d5"
              strokeOpacity=".3"
            />
          </g>
        ))}
        <path
          d="M225 126 230 145 249 150 230 155 225 174 220 155 201 150 220 145Z"
          fill="#d8bc87"
        />
        <circle
          cx="225"
          cy="150"
          r="31"
          fill="none"
          stroke="#d8bc87"
          strokeOpacity=".5"
        />
        <text x="94" y="94" fill="#cfb580" fontSize="28">
          ☽
        </text>
        <text x="337" y="228" fill="#d7c8e2" fontSize="24">
          ✧
        </text>
        <text x="289" y="38" fill="#d7c8e2" fontSize="15">
          ✦
        </text>
        <text x="56" y="178" fill="#d7c8e2" fontSize="11">
          ✦
        </text>
        <text
          x="225"
          y="294"
          textAnchor="middle"
          letterSpacing="3"
          fill="#c9b8d6"
          fontSize="8"
        >
          ЕДИН АТЛАС. ВАШИТЕ ХОРА.
        </text>
      </svg>
    </div>
  );
}
export default function Wheel({
  person,
  other,
  rules = DEFAULT_ASPECTS,
}: {
  person: Person;
  other?: Person;
  rules?: AspectSetting[];
}) {
  const [hidden, setHidden] = useState<Point[]>([]),
    [lines, setLines] = useState(true),
    [selected, setSelected] = useState("");
  const pa = positions(person).filter(
    (p) => usable(p, true, true) && !hidden.includes(p.point),
  );
  const pb = other
    ? positions(other).filter(
        (p) => usable(p, true, true) && !hidden.includes(p.point),
      )
    : [];
  const asc = pa.find((p) => p.point === "asc")?.longitude ?? 0;
  const xy = (lon: number, r: number) => {
    const a = ((180 - lon + asc) * Math.PI) / 180;
    return [250 + Math.cos(a) * r, 250 + Math.sin(a) * r];
  };
  const lineResults = aspects(pa, other ? pb : pa, rules, { same: !other });
  const labels = useMemo(() => {
    const make = (ps: typeof pa, r: number) => {
      const sorted = [...ps].sort((a, b) => a.longitude! - b.longitude!);
      return sorted.map((p, i) => {
        const prev = sorted[i - 1];
        const near = prev && Math.abs(p.longitude! - prev.longitude!) < 7;
        return { p, r: r + (near ? (i % 2 ? 14 : -9) : 0) };
      });
    };
    return [make(pa, other ? 166 : 174), make(pb, 137)];
  }, [pa, pb, other]);
  return (
    <div className="wheel-component">
      <div className="wheel-toolbar">
        <span>
          <span className="legend-dot purple" />
          {person.name}
        </span>
        {other && (
          <span>
            <span className="legend-dot gold" />
            {other.name}
          </span>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={lines}
            onChange={(e) => setLines(e.target.checked)}
          />{" "}
          Аспектни линии
        </label>
      </div>
      <svg
        className="natal-wheel"
        viewBox="0 0 500 500"
        aria-label={other ? "Синастрия" : "Натална карта"}
      >
        <circle cx="250" cy="250" r="238" fill="#fdfbf7" stroke="#dfd9e3" />
        {[211, 196, other ? 151 : 146, 112].map((r) => (
          <circle
            key={r}
            cx="250"
            cy="250"
            r={r}
            fill="none"
            stroke="#dfd9e3"
            strokeWidth=".8"
          />
        ))}
        {Array.from({ length: 360 }, (_, i) => {
          const [x1, y1] = xy(i, 196);
          const [x2, y2] = xy(i, i % 30 === 0 ? 211 : i % 5 === 0 ? 205 : 200);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#a59aaf"
              strokeWidth={i % 30 === 0 ? 1 : 0.5}
            />
          );
        })}
        {GLYPHS.map((s, i) => {
          const [x, y] = xy(i * 30 + 15, 224);
          const [a, b] = xy(i * 30, 211);
          const [c, d] = xy(i * 30, 237);
          return (
            <g key={s}>
              <line x1={a} y1={b} x2={c} y2={d} stroke="#ded6d0" />
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                fill={["#a46e57", "#778878", "#ad9456", "#78859f"][i % 4]}
                fontSize="22"
              >
                {`${s}\uFE0E`}
              </text>
            </g>
          );
        })}
        {!person.stale &&
          person.chart?.cusps.map((c, i) => {
            const [x, y] = xy(c, 196);
            const [ix, iy] = xy(c, 112);
            const [tx, ty] = xy(
              (c + ((person.chart!.cusps[(i + 1) % 12] - c + 360) % 360) / 2) %
                360,
              126,
            );
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={y}
                  x2={ix}
                  y2={iy}
                  stroke="#c7becd"
                  strokeWidth=".8"
                />
                <text
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  fill="#9b8ba4"
                  fontSize="10"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        {lines &&
          lineResults.map((r, i) => {
            const [x, y] = xy(r.a.longitude!, 109),
              [x2, y2] = xy(r.b.longitude!, 109);
            return (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={x2}
                y2={y2}
                stroke={
                  r.aspect.angle === 90 || r.aspect.angle === 180
                    ? "#bc8b7c"
                    : "#8b86ac"
                }
                opacity=".5"
                strokeWidth=".8"
              >
                <title>
                  {pointName(r.a.point)} — {r.aspect.label} —{" "}
                  {pointName(r.b.point)}
                </title>
              </line>
            );
          })}
        {labels.map((group, gi) =>
          group.map(({ p, r }) => {
            const [x, y] = xy(p.longitude!, r);
            const label = `${gi === 1 ? other!.name : person.name}: ${pointName(p.point)} · ${formatPosition(p)} (${p.longitude!.toFixed(6)}°)${p.retro ? " · Ретроградна" : ""}${p.house ? ` · Дом ${p.house}` : ""}${p.approximate ? " · Приблизително" : ""}${p.status === "review" ? " · За проверка" : ""}`;
            return (
              <g
                key={`${gi}-${p.point}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                className="planet-svg"
                onClick={() => setSelected(label)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(label);
                }}
              >
                <circle cx={x} cy={y} r="13" fill="#fdfbf7" />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill={gi ? "#a88244" : "#665077"}
                  fontSize={pointGlyph(p.point).length > 1 ? "10" : "20"}
                >
                  {pointGlyph(p.point)}
                </text>
                <title>{label}</title>
              </g>
            );
          }),
        )}
        <circle cx="250" cy="250" r="22" fill="#f8f3ed" />
        <text x="250" y="257" textAnchor="middle" fill="#bc9b62" fontSize="23">
          ✧
        </text>
      </svg>
      <div className="wheel-tooltip" aria-live="polite">
        {selected || "Докоснете символ за точната позиция"}
      </div>
      <details className="point-legend">
        <summary>Легенда и видими точки</summary>
        <div className="point-checkboxes">
          {POINTS.map(([id, name, glyph]) => (
            <label key={id} className="check">
              <input
                type="checkbox"
                checked={!hidden.includes(id)}
                onChange={() =>
                  setHidden((h) =>
                    h.includes(id) ? h.filter((p) => p !== id) : [...h, id],
                  )
                }
              />
              <span>
                {glyph} {name}
              </span>
            </label>
          ))}
        </div>
      </details>
      {!person.chart?.cusps.length && (
        <p className="fine-print">
          Домове се показват само при налични изчислени куспиди. Външният
          пръстен е зодиакът.
        </p>
      )}
    </div>
  );
}
