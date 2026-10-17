import Papa from "papaparse";
import { useState } from "react";
import { Download } from "lucide-react";
import { formatArc, formatPosition, download } from "../astro";
import { pointName, pointGlyph, type AspectResult } from "../types";
export function exportAspects(rows: AspectResult[]) {
  download(
    "astro-atlas-aspekti.csv",
    "\uFEFF" +
      Papa.unparse(
        rows.map((r) => ({
          "Човек 1": r.personA?.name || "",
          "Човек 2": r.personB?.name || "",
          "Точка 1": pointName(r.a.point),
          "Позиция 1": formatPosition(r.a),
          "Точка 2": pointName(r.b.point),
          "Позиция 2": formatPosition(r.b),
          Аспект: r.aspect.label,
          "Ъглово разстояние": r.distance,
          Орбис: r.orb,
          Приблизително: r.approximate ? "Да" : "Не",
        })),
        { escapeFormulae: true },
      ),
    "text/csv;charset=utf-8",
  );
}
export default function AspectTable({
  rows,
  showPeople = false,
}: {
  rows: AspectResult[];
  showPeople?: boolean;
}) {
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 50) - 1));
  return (
    <>
      <div className="table-caption">
        <span>
          {rows.length} {rows.length === 1 ? "аспект" : "аспекта"} · по
          най-малък орбис
        </span>
        <button
          className="text-button"
          onClick={() => exportAspects(rows)}
          disabled={!rows.length}
        >
          <Download size={15} /> CSV експорт
        </button>
      </div>
      {!rows.length ? (
        <div className="small-empty">
          Няма аспекти в избрания орбис. Проверете филтрите и наличните позиции.
        </div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="aspect-table">
              <thead>
                <tr>
                  {showPeople && <th>Хора</th>}
                  <th>Първа точка</th>
                  <th>Аспект</th>
                  <th>Втора точка</th>
                  <th>Разстояние</th>
                  <th>Орбис</th>
                  <th>Точност</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(current * 50, current * 50 + 50).map((r, i) => (
                  <tr key={i}>
                    {showPeople && (
                      <td data-label="Хора">
                        <strong>{r.personA?.name}</strong>
                        <small>{r.personB?.name}</small>
                      </td>
                    )}
                    <td data-label="Първа точка">
                      <strong>
                        <span className="point-symbol">
                          {pointGlyph(r.a.point)}
                        </span>
                        {pointName(r.a.point)}
                      </strong>
                      <small>{formatPosition(r.a)}</small>
                    </td>
                    <td data-label="Аспект">
                      <span className={`aspect-tag ${r.aspect.id}`}>
                        <span>{r.aspect.symbol}</span>
                        {r.aspect.label}
                      </span>
                    </td>
                    <td data-label="Втора точка">
                      <strong>
                        <span className="point-symbol">
                          {pointGlyph(r.b.point)}
                        </span>
                        {pointName(r.b.point)}
                      </strong>
                      <small>{formatPosition(r.b)}</small>
                    </td>
                    <td data-label="Разстояние">{formatArc(r.distance)}</td>
                    <td data-label="Орбис" className="orb-cell">
                      {formatArc(r.orb)}
                    </td>
                    <td data-label="Точност">
                      <span
                        className={`status-tag ${r.approximate ? "warning" : ""}`}
                      >
                        {r.approximate ? "Приблизително" : "Потвърдени данни"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && (
            <div className="pagination">
              <button
                className="button secondary small"
                disabled={!current}
                onClick={() => setPage(current - 1)}
              >
                Назад
              </button>
              <span>
                Страница {current + 1} от {Math.ceil(rows.length / 50)}
              </span>
              <button
                className="button secondary small"
                disabled={(current + 1) * 50 >= rows.length}
                onClick={() => setPage(current + 1)}
              >
                Напред
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
