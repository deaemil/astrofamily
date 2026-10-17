import { useState } from "react";
import Papa from "papaparse";
import {
  ArrowLeft,
  PenLine,
  Trash2,
  Download,
  Network,
  MapPin,
  CalendarDays,
  RefreshCw,
  Info,
} from "lucide-react";
import { POINTS, SIGNS, pointName, type Person, type Settings } from "../types";
import { aspects, download, formatPosition, positions } from "../astro";
import Wheel from "./Wheel";
import AspectTable from "./AspectTable";
export default function Profile({
  person,
  settings,
  onBack,
  onEdit,
  onDelete,
  onCompare,
}: {
  person: Person;
  settings: Settings;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCompare: () => void;
}) {
  const [tab, setTab] = useState("chart"),
    [conditional, setConditional] = useState(false),
    [review, setReview] = useState(false);
  const ps = positions(person);
  const exportPositions = () =>
    download(
      "astro-atlas-pozitsii.csv",
      "\uFEFF" +
        Papa.unparse(
          ps
            .filter((p) => p.longitude != null)
            .map((p) => ({
              Име: person.name,
              Точка: pointName(p.point),
              Знак: SIGNS[Math.floor(p.longitude! / 30)],
              Градуси: Math.floor(p.longitude! % 30),
              Минути: p.minutesMissing
                ? ""
                : Math.floor((p.longitude! % 1) * 60 + 1e-6),
              Ретроградност:
                p.retro == null ? "Неизвестно" : p.retro ? "Да" : "Не",
              Дом: p.house ?? "",
              Статус: p.status === "review" ? "За проверка" : "Потвърдена",
              Бележка: p.note || "",
              Дължина: p.longitude,
            })),
          { escapeFormulae: true },
        ),
      "text/csv;charset=utf-8",
    );
  return (
    <>
      <button className="text-button back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Всички хора
      </button>
      <div className="profile-heading">
        <div className="avatar large">{person.name.slice(0, 1)}</div>
        <div>
          <span className="eyebrow">ЛИЧНА НАТАЛНА КАРТА</span>
          <h1>{person.name}</h1>
          <p>
            {person.relationship || "Личен профил"}
            {person.group && ` · ${person.group}`}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={onEdit}>
            <PenLine size={15} /> Редактирай
          </button>
          <button
            className="icon-button danger"
            aria-label="Изтрий човека"
            onClick={onDelete}
          >
            <Trash2 size={18} />
          </button>
          <button className="button primary" onClick={onCompare}>
            <Network size={17} /> Сравни с близки
          </button>
        </div>
      </div>
      {person.stale && (
        <div className="notice warning">
          <RefreshCw size={18} />
          <span>
            Картата изисква преизчисление след промяна на данните или
            настройките. Старите изчислени позиции са изключени от всички
            резултати.
          </span>
          <button className="button secondary small" onClick={onEdit}>
            Преизчисли
          </button>
        </div>
      )}
      {person.chart?.warnings.map((w) => (
        <div key={w} className="notice">
          <Info size={17} />
          {w}
        </div>
      ))}
      {person.chart?.moonRange && (
        <div className="notice">
          ☽ Луната през рожденото денонощие:{" "}
          {person.chart.moonRange.map(formatPosition).join(" → ")}. Диапазонът
          следва движението през зодиака.
        </div>
      )}
      <div className="profile-tabs">
        {[
          ["chart", "Карта"],
          ["positions", "Позиции"],
          ["aspects", "Аспекти"],
          ["birth", "Рождени данни"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "chart" && (
        <div className="chart-layout">
          <div className="panel chart-panel">
            {ps.some((p) => p.longitude != null) ? (
              <Wheel person={person} rules={settings.aspects} />
            ) : (
              <div className="empty-state">
                <h3>Картата още не е налична</h3>
                <p>Изчислете по рождените данни или въведете позиции ръчно.</p>
                <button className="button primary" onClick={onEdit}>
                  Попълни картата
                </button>
              </div>
            )}
          </div>
          <aside className="chart-summary panel">
            <span className="eyebrow">ВАШИЯТ ЗВЕЗДЕН ПОЧЕРК</span>
            <h2>Основни позиции</h2>
            {["sun", "moon", "asc"].map((point) => {
              const p = ps.find((x) => x.point === point);
              return (
                <div className="big-position" key={point}>
                  <span>{POINTS.find((t) => t[0] === point)?.[2]}</span>
                  <div>
                    <small>{pointName(point)}</small>
                    <strong>{formatPosition(p)}</strong>
                    {p?.approximate && <small>Приблизително</small>}
                  </div>
                </div>
              );
            })}
            <hr />
            <dl className="details-list">
              <dt>Метод</dt>
              <dd>
                {person.mode === "manual"
                  ? "Ръчно въведени позиции"
                  : person.chart?.engine || "Неизчислена"}
              </dd>
              <dt>Зодиак</dt>
              <dd>Тропически</dd>
              <dt>Център</dt>
              <dd>Геоцентричен</dd>
              <dt>Домове</dt>
              <dd>
                {person.chart?.settings.houses === "P"
                  ? "Placidus"
                  : person.chart?.settings.houses === "W"
                    ? "Whole Sign"
                    : person.chart?.settings.houses === "E"
                      ? "Equal House"
                      : "Не са изчислени"}
              </dd>
              <dt>Лилит</dt>
              <dd>Среден лунен апогей</dd>
              <dt>Възел</dt>
              <dd>
                {person.chart?.settings.node === "mean"
                  ? "Среден"
                  : person.chart
                    ? "Истински"
                    : "Според източника"}
              </dd>
            </dl>
            <div className="private-note">
              Няма оценки за съвместимост. Само реални позиции и геометрични
              връзки.
            </div>
          </aside>
        </div>
      )}
      {tab === "positions" && (
        <div className="panel">
          <div className="table-caption">
            <h3>Планети и точки</h3>
            <button
              className="text-button"
              onClick={exportPositions}
              disabled={!ps.length}
            >
              <Download size={15} /> CSV експорт
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Точка</th>
                  <th>Позиция</th>
                  <th>Ретроградност</th>
                  <th>Дом</th>
                  <th>Източник / статус</th>
                  <th>Бележка</th>
                </tr>
              </thead>
              <tbody>
                {POINTS.map(([id, label, glyph]) => {
                  const p = ps.find((p) => p.point === id);
                  return (
                    <tr key={id}>
                      <td>
                        <span className="point-symbol">{glyph}</span>
                        <strong>{label}</strong>
                      </td>
                      <td>{formatPosition(p)}</td>
                      <td>
                        {[
                          "asc",
                          "dsc",
                          "mc",
                          "ic",
                          "vertex",
                          "fortune",
                        ].includes(id)
                          ? "Не се прилага"
                          : p?.retro == null
                            ? "Неизвестно"
                            : p.retro
                              ? "Да · R"
                              : "Не"}
                      </td>
                      <td>{p?.house ?? "—"}</td>
                      <td>
                        {p?.longitude != null ? (
                          <>
                            <span className="status-tag">
                              {p.source === "manual" ? "Ръчна" : "Изчислена"}
                            </span>{" "}
                            <span
                              className={`status-tag ${p.status === "review" || p.approximate ? "warning" : ""}`}
                            >
                              {p.status === "review"
                                ? "За проверка"
                                : p.approximate
                                  ? "Приблизително"
                                  : "Потвърдена"}
                            </span>
                          </>
                        ) : (
                          "Не е налична"
                        )}
                      </td>
                      <td className="note-cell">
                        {p?.note || p?.reason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "aspects" && (
        <div className="panel">
          <div className="table-caption">
            <h3>Аспекти в собствената карта</h3>
          </div>
          <div className="inline-options">
            <label className="check">
              <input
                type="checkbox"
                checked={conditional}
                onChange={(e) => setConditional(e.target.checked)}
              />{" "}
              Включи условните позиции
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={review}
                onChange={(e) => setReview(e.target.checked)}
              />{" "}
              Включи „За проверка“
            </label>
          </div>
          <AspectTable
            rows={aspects(ps, ps, settings.aspects, {
              same: true,
              conditional,
              review,
            }).map((r) => ({ ...r, personA: person, personB: person }))}
          />
        </div>
      )}
      {tab === "birth" && (
        <div className="panel birth-panel">
          <h2>Рождени данни</h2>
          {person.birth ? (
            <>
              <div className="birth-highlights">
                <span>
                  <CalendarDays />
                  {person.birth.date.split("-").reverse().join(".")} ·{" "}
                  {person.birth.accuracy === "unknown"
                    ? "Неизвестен час"
                    : person.birth.time}
                </span>
                <span>
                  <MapPin />
                  {person.birth.city}, {person.birth.country}
                </span>
              </div>
              <dl className="details-list">
                <dt>Точност на часа</dt>
                <dd>
                  {
                    {
                      exact: "Точен",
                      approximate: "Приблизителен",
                      unknown: "Неизвестен",
                    }[person.birth.accuracy]
                  }
                </dd>
                <dt>Координати</dt>
                <dd>
                  {person.birth.lat}°, {person.birth.lon}°
                </dd>
                <dt>Часова зона</dt>
                <dd>{person.chart?.timezone || person.birth.timezone}</dd>
                <dt>UTC отместване на рождената дата</dt>
                <dd>
                  {person.chart
                    ? `${person.chart.utcOffset} минути${person.birth.offset !== null ? " · Ръчна корекция" : ""}`
                    : "Неизчислено"}
                </dd>
                <dt>Момент в UTC</dt>
                <dd>{person.chart?.utc || "Неизчислен"}</dd>
                <dt>Юлиански ден</dt>
                <dd>{person.chart?.julianDay ?? "Неизчислен"}</dd>
              </dl>
              {person.stale && (
                <p className="notice warning">
                  Показаните метаданни за старата карта не са актуални. Нужно е
                  преизчисление.
                </p>
              )}
            </>
          ) : (
            <p>Картата е въведена ръчно и няма задължителни рождени данни.</p>
          )}
          <h3>Бележки</h3>
          <p className="notes">
            {person.notes || "Все още няма добавени бележки."}
          </p>
          <p className="fine-print">
            Последна промяна:{" "}
            {new Date(person.updatedAt).toLocaleString("bg-BG")}
          </p>
        </div>
      )}
    </>
  );
}
