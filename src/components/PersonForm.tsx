import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  MapPin,
  PenLine,
  Sparkles,
  LoaderCircle,
  Info,
  RotateCcw,
} from "lucide-react";
import { Modal } from "./ui";
import { manualPosition, formatPosition } from "../astro";
import { searchPlaces, type Place } from "../places";
import {
  POINTS,
  SIGNS,
  type Birth,
  type CalcSettings,
  type Person,
  type Point,
  type Position,
} from "../types";
interface ManualRow {
  sign: string;
  degree: string;
  minute: string;
  retro: string;
  house: string;
  status: "confirmed" | "review";
  note: string;
}
const blankRow = (): ManualRow => ({
  sign: "0",
  degree: "",
  minute: "",
  retro: "unknown",
  house: "",
  status: "confirmed",
  note: "",
});
export default function PersonForm({
  person,
  settings,
  onClose,
  onSave,
}: {
  person?: Person;
  settings: CalcSettings;
  onClose: () => void;
  onSave: (person: Person) => Promise<void>;
}) {
  const [mode, setMode] = useState<"automatic" | "manual">(
    person?.mode || "automatic",
  );
  const [name, setName] = useState(person?.name || ""),
    [relationship, setRelationship] = useState(person?.relationship || ""),
    [group, setGroup] = useState(person?.group || ""),
    [notes, setNotes] = useState(person?.notes || "");
  const [birth, setBirth] = useState<Birth>(
    person?.birth || {
      date: "",
      time: "",
      accuracy: "exact",
      city: "",
      country: "",
      lat: 42.6977,
      lon: 23.3219,
      timezone: "Europe/Sofia",
      offset: null,
    },
  );
  const [placeChosen, setPlaceChosen] = useState(!!person?.birth),
    [places, setPlaces] = useState<Place[]>([]),
    [placeWarning, setPlaceWarning] = useState(""),
    [citySearch, setCitySearch] = useState("");
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeUnavailable, setPlaceUnavailable] = useState(false);
  const [placeRetry, setPlaceRetry] = useState(0);
  const [activePlace, setActivePlace] = useState(-1);
  const cityInput = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [calcSettings, setCalcSettings] = useState(settings);
  const [rows, setRows] = useState<Record<string, ManualRow>>(() =>
    Object.fromEntries(
      POINTS.map(([point]) => {
        const p = person?.overrides.find((p) => p.point === point);
        if (p?.longitude == null) return [point, blankRow()];
        const total = Math.round(p.longitude * 60) % 21600;
        return [
          point,
          {
            sign: String(Math.floor(total / 1800)),
            degree: String(Math.floor((total % 1800) / 60)),
            minute: p.minutesMissing ? "" : String(total % 60),
            retro: p.retro == null ? "unknown" : p.retro ? "yes" : "no",
            house: p.house ? String(p.house) : "",
            status: p.status || "confirmed",
            note: p.note || "",
          },
        ];
      }),
    ),
  );
  const originalRows = useRef(rows);
  const setB = <K extends keyof Birth>(key: K, value: Birth[K]) =>
    setBirth((b) => ({ ...b, [key]: value }));
  function choosePlace(p: Place) {
    setBirth((b) => ({
      ...b,
      city: p.name,
      country: p.country,
      lat: p.lat,
      lon: p.lon,
      timezone: p.timezone,
    }));
    setCitySearch("");
    setPlaceChosen(true);
    setPlaces([]);
    setPlaceWarning("");
    setPlaceUnavailable(false);
    setActivePlace(-1);
    setError("");
  }
  useEffect(() => {
    setPlaces([]);
    setActivePlace(-1);
    setPlaceWarning("");
    setPlaceUnavailable(false);
    if (citySearch.trim().length < 2) {
      setPlaceSearching(false);
      return;
    }
    const controller = new AbortController();
    setPlaceSearching(true);
    const t = setTimeout(async () => {
      try {
        const result = await searchPlaces(citySearch, controller.signal);
        if (controller.signal.aborted) return;
        setPlaces(result.places);
        setPlaceWarning(
          result.warning ||
            (!result.places.length
              ? "Няма намерени места. Опитайте друго изписване или въведете координати ръчно."
              : ""),
        );
      } catch {
        if (!controller.signal.aborted) {
          setPlaceUnavailable(true);
          setPlaceWarning(
            "Няма връзка с изчислителния сървър. Оставете терминала с „npm run dev“ отворен и натиснете „Опитай отново“.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setPlaceSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [citySearch, placeRetry]);
  const updateRow = (point: Point, patch: Partial<ManualRow>) =>
    setRows((r) => ({ ...r, [point]: { ...r[point], ...patch } }));
  async function submit(e?: FormEvent, skipCalculation = false) {
    e?.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Въведете име.");
      return;
    }
    setBusy(true);
    try {
      const overrides = POINTS.map(([point]) => {
        const r = rows[point];
        const position = manualPosition(
          point,
          r.sign,
          r.degree,
          r.minute,
          r.retro,
          r.house,
          r.status,
          r.note,
        );
        const original = person?.overrides.find((p) => p.point === point);
        const initial = originalRows.current[point];
        if (
          position &&
          original?.longitude != null &&
          r.sign === initial.sign &&
          r.degree === initial.degree &&
          r.minute === initial.minute
        )
          position.longitude = original.longitude;
        return position;
      }).filter((p): p is Position => p !== null);
      if (mode === "manual" && !overrides.length)
        throw new Error(
          "Въведете поне една позиция. Празен градус не означава 0°.",
        );
      const next: Person = {
        id: person?.id || crypto.randomUUID(),
        name: name.trim(),
        relationship: relationship.trim(),
        group: group.trim(),
        notes,
        mode,
        birth: mode === "automatic" ? birth : person?.birth || null,
        chart: mode === "automatic" ? person?.chart || null : null,
        overrides,
        stale: false,
        updatedAt: new Date().toISOString(),
      };
      if (mode === "automatic") {
        if (!birth.date || (birth.accuracy !== "unknown" && !birth.time))
          throw new Error("Въведете дата и час или изберете „Неизвестен“.");
        if (
          !Number.isFinite(birth.lat) ||
          Math.abs(birth.lat) > 90 ||
          !Number.isFinite(birth.lon) ||
          Math.abs(birth.lon) > 180 ||
          (birth.offset !== null &&
            (!Number.isInteger(birth.offset) || Math.abs(birth.offset) > 840))
        )
          throw new Error("Проверете координатите и UTC отместването.");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(birth.date) ||
          birth.date < "1600-01-01" ||
          birth.date > "2399-12-31" ||
          (birth.accuracy !== "unknown" &&
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.time))
        )
          throw new Error("Въведете валидни дата (1600–2399 г.) и час.");
        if (!placeChosen) {
          cityInput.current?.focus();
          if (placeUnavailable)
            throw new Error(
              "Мястото още не е избрано, защото няма връзка със сървъра. Стартирайте „npm run dev“, потърсете града отново и го изберете от списъка.",
            );
          throw new Error(
            "Натиснете името на града в списъка под полето или използвайте стрелките и Enter. За ръчни координати отворете „Преглед и корекция“ и ги потвърдете.",
          );
        }
        if (skipCalculation) next.stale = true;
        else {
          const r = await fetch("/api/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              birth: {
                ...birth,
                time: birth.accuracy === "unknown" ? "12:00" : birth.time,
              },
              settings: calcSettings,
            }),
          });
          const d = await r.json();
          if (!r.ok)
            throw new Error(
              typeof d.detail === "string"
                ? d.detail
                : "Проверете рождените данни. Датата трябва да е валидна и координатите да са в допустимите граници.",
            );
          next.chart = d;
        }
      }
      await onSave(next);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Изчислителният сървър не е достъпен. Проверете връзката и стартирането на услугата."
          : e instanceof Error
            ? e.message
            : "Записът не успя. Проверете дали изчислителният сървър е стартиран.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={person ? "Редактиране на човек" : "Добавете човек"}
      subtitle="Всяка връзка започва с една карта."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="form-body">
          <div className="form-grid">
            <label className="field span-2">
              Име <span className="required">*</span>
              <input
                required
                maxLength={200}
                placeholder="Как се казва вашият човек?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              Роднинска връзка
              <input
                placeholder="напр. Майка, Приятел"
                value={relationship}
                maxLength={100}
                onChange={(e) => setRelationship(e.target.value)}
              />
            </label>
            <label className="field">
              Семейна група
              <input
                placeholder="напр. Семейство"
                value={group}
                maxLength={100}
                onChange={(e) => setGroup(e.target.value)}
              />
            </label>
          </div>
          <div className="mode-tabs">
            <button
              type="button"
              className={mode === "automatic" ? "active" : ""}
              onClick={() => setMode("automatic")}
            >
              <Sparkles size={17} /> По рождени данни
            </button>
            <button
              type="button"
              className={mode === "manual" ? "active" : ""}
              onClick={() => setMode("manual")}
            >
              <PenLine size={17} /> Въведи позиции ръчно
            </button>
          </div>
          {mode === "automatic" ? (
            <>
              <div className="section-label">
                <CalendarDays size={16} /> РОЖДЕНИ ДАННИ
              </div>
              <div className="form-grid three">
                <label className="field">
                  Дата на раждане
                  <input
                    type="date"
                    min="1600-01-01"
                    max="2399-12-31"
                    required
                    value={birth.date}
                    onChange={(e) => setB("date", e.target.value)}
                  />
                </label>
                <label className="field">
                  Местен час
                  <input
                    type="time"
                    required={birth.accuracy !== "unknown"}
                    disabled={birth.accuracy === "unknown"}
                    value={birth.time}
                    onChange={(e) => setB("time", e.target.value)}
                  />
                </label>
                <label className="field">
                  Точност на часа
                  <select
                    value={birth.accuracy}
                    onChange={(e) =>
                      setB("accuracy", e.target.value as Birth["accuracy"])
                    }
                  >
                    <option value="exact">Точен</option>
                    <option value="approximate">Приблизителен</option>
                    <option value="unknown">Неизвестен</option>
                  </select>
                </label>
              </div>
              {birth.accuracy !== "exact" && (
                <p className="notice">
                  <Info size={17} />
                  {birth.accuracy === "unknown"
                    ? "Използваме условно 12:00 местно време. Без домове и ъгли; позициите не участват в сравненията по подразбиране."
                    : "Картата и зависимите от часа позиции ще бъдат обозначени като приблизителни."}
                </p>
              )}
              <div className="place-field">
                <label className="field">
                  Място на раждане
                  <div className="input-icon">
                    <MapPin size={17} aria-hidden="true" />
                    <input
                      ref={cityInput}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={places.length > 0}
                      aria-controls="birth-place-results"
                      aria-activedescendant={
                        activePlace >= 0
                          ? `birth-place-${activePlace}`
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" && places.length) {
                          e.preventDefault();
                          setActivePlace((i) => (i + 1) % places.length);
                        }
                        if (e.key === "ArrowUp" && places.length) {
                          e.preventDefault();
                          setActivePlace(
                            (i) => (i - 1 + places.length) % places.length,
                          );
                        }
                        if (e.key === "Enter" && places.length) {
                          e.preventDefault();
                          e.stopPropagation();
                          choosePlace(places[Math.max(0, activePlace)]);
                        }
                        if (e.key === "Escape" && places.length) {
                          e.preventDefault();
                          e.stopPropagation();
                          setCitySearch("");
                        }
                      }}
                      placeholder="Потърсете град, напр. София"
                      autoComplete="off"
                      value={birth.city}
                      onChange={(e) => {
                        setB("city", e.target.value);
                        setCitySearch(e.target.value);
                        setPlaceChosen(false);
                      }}
                    />
                  </div>
                </label>
                {places.length > 0 && (
                  <div
                    className="place-results"
                    role="listbox"
                    aria-label="Намерени населени места"
                    id="birth-place-results"
                  >
                    {places.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        id={`birth-place-${i}`}
                        aria-selected={activePlace === i}
                        className={activePlace === i ? "highlighted" : ""}
                        onMouseEnter={() => setActivePlace(i)}
                        onClick={() => choosePlace(p)}
                      >
                        <MapPin size={16} />
                        <span>
                          {p.name}
                          <small>
                            {p.country} · {p.timezone}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {placeSearching && (
                <p className="field-help" role="status">
                  <LoaderCircle size={13} className="spin" aria-hidden="true" />{" "}
                  Търсене на места…
                </p>
              )}
              {!placeChosen && places.length > 0 && (
                <p className="field-help">
                  Натиснете града в списъка или го изберете със стрелките и
                  Enter.
                </p>
              )}
              {placeChosen && (
                <p className="field-help">
                  {birth.country} · {birth.lat.toFixed(4)}°,{" "}
                  {birth.lon.toFixed(4)}° · {birth.timezone}
                </p>
              )}
              {placeWarning && (
                <div className="notice" role="status">
                  <span>{placeWarning}</span>
                  {placeUnavailable && (
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setPlaceRetry((i) => i + 1)}
                    >
                      Опитай отново
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                className="text-button"
                onClick={() => setAdvanced(!advanced)}
              >
                {advanced ? "Скрий" : "Преглед и корекция на"} координатите и
                часовата зона
              </button>
              {advanced && (
                <div className="advanced-box">
                  <div className="form-grid three">
                    <label className="field">
                      Ширина
                      <input
                        type="number"
                        min="-90"
                        max="90"
                        step="any"
                        value={birth.lat}
                        onChange={(e) => {
                          setB("lat", Number(e.target.value));
                          setPlaceChosen(false);
                        }}
                      />
                    </label>
                    <label className="field">
                      Дължина
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        step="any"
                        value={birth.lon}
                        onChange={(e) => {
                          setB("lon", Number(e.target.value));
                          setPlaceChosen(false);
                        }}
                      />
                    </label>
                    <label className="field">
                      Държава
                      <input
                        value={birth.country}
                        onChange={(e) => setB("country", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      IANA часова зона
                      <input
                        value={birth.timezone}
                        placeholder="Europe/Sofia"
                        onChange={(e) => setB("timezone", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Ръчно UTC отместване (минути)
                      <input
                        type="number"
                        min="-840"
                        max="840"
                        placeholder="Автоматично за рождената дата"
                        value={birth.offset ?? ""}
                        onChange={(e) =>
                          setB(
                            "offset",
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={async () => {
                        try {
                          const r = await fetch(
                            `/api/timezone?lat=${birth.lat}&lon=${birth.lon}`,
                          );
                          const d = await r.json();
                          if (!d.timezone) throw Error();
                          setB("timezone", d.timezone);
                          setPlaceChosen(true);
                          setError("");
                        } catch {
                          setError(
                            "Неуспешно определяне на зона. Проверете координатите или въведете IANA зона ръчно.",
                          );
                        }
                      }}
                    >
                      Определи зоната по координати
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setPlaceChosen(true)}
                    >
                      {placeChosen
                        ? "Координатите са потвърдени"
                        : "Потвърди ръчните координати"}
                    </button>
                  </div>
                  <p className="fine-print">
                    Отместването се изчислява по историческите правила на IANA
                    за рождената дата. Ръчната стойност има предимство; оставете
                    празно за автоматично.
                  </p>
                </div>
              )}
              <div className="form-grid">
                <label className="field">
                  Домова система
                  <select
                    value={calcSettings.houses}
                    onChange={(e) =>
                      setCalcSettings((s) => ({
                        ...s,
                        houses: e.target.value as CalcSettings["houses"],
                      }))
                    }
                  >
                    <option value="P">Placidus</option>
                    <option value="W">Whole Sign</option>
                    <option value="E">Equal House</option>
                  </select>
                </label>
                <label className="field">
                  Лунен възел
                  <select
                    value={calcSettings.node}
                    onChange={(e) =>
                      setCalcSettings((s) => ({
                        ...s,
                        node: e.target.value as CalcSettings["node"],
                      }))
                    }
                  >
                    <option value="true">Истински</option>
                    <option value="mean">Среден</option>
                  </select>
                </label>
              </div>
              <p className="field-help">
                Тропически зодиак · Геоцентрични позиции · Лилит: среден лунен
                апогей
              </p>
              {person && (
                <details>
                  <summary>Ръчни корекции на изчислените позиции</summary>
                  <ManualInputs
                    rows={rows}
                    update={updateRow}
                    person={person}
                  />
                </details>
              )}
            </>
          ) : (
            <>
              <p className="notice">
                <Info size={17} />
                Попълнете само известните позиции. Празен градус не е 0°. Без
                минути сравнението е приблизително. Лилит означава среден лунен
                апогей; уточнете друг вид в бележката.
              </p>
              <ManualInputs rows={rows} update={updateRow} person={person} />
            </>
          )}
          <label className="field">
            Бележки
            <textarea
              rows={2}
              maxLength={5000}
              placeholder="История, източник на данните или нещо важно…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Отказ
          </button>
          {mode === "automatic" && (
            <button
              type="button"
              className="text-button save-without"
              disabled={busy}
              onClick={() => void submit(undefined, true)}
            >
              Запази без карта
            </button>
          )}
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : mode === "automatic" ? (
              <Sparkles size={17} />
            ) : (
              <PenLine size={17} />
            )}{" "}
            {busy
              ? "Изчисляване…"
              : mode === "automatic"
                ? "Изчисли и запази"
                : "Запази човека"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ManualInputs({
  rows,
  update,
  person,
}: {
  rows: Record<string, ManualRow>;
  update: (point: Point, patch: Partial<ManualRow>) => void;
  person?: Person;
}) {
  return (
    <div className="manual-inputs">
      {POINTS.map(([point, name, glyph]) => {
        const r = rows[point],
          original = person?.chart?.positions.find((p) => p.point === point);
        return (
          <div className="manual-row" key={point}>
            <div className="manual-point">
              <span>{glyph}</span>
              <strong>{name}</strong>
              {original && <small>Изчислена: {formatPosition(original)}</small>}
            </div>
            <div className="manual-values">
              <label>
                Знак
                <select
                  aria-label={`${name}: знак`}
                  value={r.sign}
                  onChange={(e) => update(point, { sign: e.target.value })}
                >
                  {SIGNS.map((s, i) => (
                    <option key={s} value={i}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Градуси
                <input
                  aria-label={`${name}: градуси`}
                  type="number"
                  min="0"
                  max="29"
                  placeholder="—"
                  value={r.degree}
                  onChange={(e) => update(point, { degree: e.target.value })}
                />
              </label>
              <label>
                Минути
                <input
                  aria-label={`${name}: минути`}
                  type="number"
                  min="0"
                  max="59"
                  placeholder="—"
                  value={r.minute}
                  onChange={(e) => update(point, { minute: e.target.value })}
                />
              </label>
              <label>
                Ретроградност
                <select
                  aria-label={`${name}: ретроградност`}
                  value={r.retro}
                  onChange={(e) => update(point, { retro: e.target.value })}
                >
                  <option value="unknown">Неизвестно</option>
                  <option value="no">Не</option>
                  <option value="yes">Да</option>
                </select>
              </label>
              <label>
                Дом
                <input
                  aria-label={`${name}: дом`}
                  type="number"
                  min="1"
                  max="12"
                  placeholder="—"
                  value={r.house}
                  onChange={(e) => update(point, { house: e.target.value })}
                />
              </label>
              <label>
                Статус
                <select
                  aria-label={`${name}: статус`}
                  value={r.status}
                  onChange={(e) =>
                    update(point, {
                      status: e.target.value as ManualRow["status"],
                    })
                  }
                >
                  <option value="confirmed">Потвърдена</option>
                  <option value="review">За проверка</option>
                </select>
              </label>
            </div>
            <div className="manual-note">
              <input
                aria-label={`${name}: бележка`}
                value={r.note}
                placeholder="Бележка към позицията"
                onChange={(e) => update(point, { note: e.target.value })}
              />
              {r.degree !== "" && (
                <button
                  type="button"
                  className="text-button small"
                  onClick={() => update(point, blankRow())}
                >
                  <RotateCcw size={13} />
                  {original ? "Възстанови изчислената" : "Изчисти"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
