import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Upload, ArrowRight, FileSpreadsheet, Info } from "lucide-react";
import { Modal } from "./ui";
import { manualPosition, positions } from "../astro";
import {
  POINTS,
  SIGNS,
  type Person,
  type Point,
  type Position,
} from "../types";
const FIELDS = [
  ["name", "Име", true],
  ["point", "Планета / точка", true],
  ["sign", "Знак", true],
  ["degree", "Градуси", true],
  ["minute", "Минути", false],
  ["retro", "Ретроградност", false],
  ["house", "Дом", false],
  ["status", "Статус", false],
  ["note", "Бележка", false],
] as const;
const ALIASES: Record<string, string[]> = {
  name: ["Име", "name", "Човек"],
  point: ["Точка", "Планета", "point"],
  sign: ["Знак", "sign"],
  degree: ["Градуси", "degree", "degrees"],
  minute: ["Минути", "minute", "minutes"],
  retro: ["Ретроградност", "retro"],
  house: ["Дом", "house"],
  status: ["Статус", "status"],
  note: ["Бележка", "note"],
};
export default function ImportModal({
  people,
  onClose,
  onSave,
}: {
  people: Person[];
  onClose: () => void;
  onSave: (people: Person[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [fileName, setFileName] = useState(""),
    [error, setError] = useState(""),
    [policy, setPolicy] = useState("skip"),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(1);
  const get = (row: Record<string, string>, field: string) =>
    (row[mapping[field]] || "").trim();
  const preview = useMemo(() => {
    const errors: string[] = [],
      valid: { name: string; position: Position; duplicate: boolean }[] = [],
      seen = new Set<string>();
    rows.forEach((row, i) => {
      try {
        const name = get(row, "name"),
          pointText = get(row, "point"),
          signText = get(row, "sign"),
          deg = get(row, "degree");
        if (!name || name.length > 200)
          throw Error("Липсва име или името е твърде дълго.");
        const point = POINTS.find(
          ([id, label]) =>
            id.toLowerCase() === pointText.toLowerCase() ||
            label.toLocaleLowerCase("bg") === pointText.toLocaleLowerCase("bg"),
        )?.[0] as Point | undefined;
        if (!point) throw Error("Непозната планета или точка: " + pointText);
        if (!deg) throw Error("Липсва градус. Празна стойност не е 0°.");
        const sign = SIGNS.findIndex(
          (s) => s.toLowerCase() === signText.toLowerCase(),
        );
        const s =
          sign >= 0
            ? String(sign)
            : /^\d+$/.test(signText) && Number(signText) <= 11
              ? signText
              : "";
        if (s === "")
          throw Error(
            "Невалиден знак. Използвайте име на български или индекс 0–11.",
          );
        const retro = get(row, "retro").toLowerCase(),
          status = get(row, "status").toLowerCase();
        if (
          ![
            "",
            "да",
            "не",
            "неизвестно",
            "yes",
            "no",
            "unknown",
            "true",
            "false",
          ].includes(retro)
        )
          throw Error("Невалидна ретроградност.");
        if (
          !["", "потвърдена", "за проверка", "confirmed", "review"].includes(
            status,
          )
        )
          throw Error("Невалиден статус.");
        const p = manualPosition(
          point,
          s,
          deg,
          get(row, "minute"),
          ["да", "yes", "true"].includes(retro)
            ? "yes"
            : ["не", "no", "false"].includes(retro)
              ? "no"
              : "unknown",
          get(row, "house"),
          ["за проверка", "review"].includes(status) ? "review" : "confirmed",
          get(row, "note"),
        )!;
        const matches = people.filter(
          (p) =>
            p.name.toLocaleLowerCase("bg") === name.toLocaleLowerCase("bg"),
        );
        if (matches.length > 1)
          throw Error(
            "Повече от един човек с това име. Разграничете имената преди импорт.",
          );
        const key = name.toLowerCase() + "-" + point;
        const duplicate =
          seen.has(key) ||
          (!!matches[0] &&
            positions(matches[0]).some((p) => p.point === point));
        seen.add(key);
        valid.push({ name, position: p, duplicate });
      } catch (e) {
        errors.push(`Ред ${i + 2}: ${(e as Error).message}`);
      }
    });
    return { errors, valid };
  }, [rows, mapping, people]);
  async function load(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("Максималният размер е 5 MB.");
      return;
    }
    setError("");
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors.length) {
      setError("CSV файлът не е валиден: " + parsed.errors[0].message);
      return;
    }
    if (!parsed.data.length || parsed.data.length > 10000) {
      setError("Файлът трябва да съдържа от 1 до 10 000 реда.");
      return;
    }
    const hs = parsed.meta.fields || [];
    setHeaders(hs);
    setRows(parsed.data);
    setFileName(file.name);
    setMapping(
      Object.fromEntries(
        FIELDS.map(([f]) => [
          f,
          hs.find((h) =>
            ALIASES[f].some((a) => a.toLowerCase() === h.toLowerCase()),
          ) || "",
        ]),
      ),
    );
    setStep(1);
  }
  async function commit() {
    setBusy(true);
    setError("");
    try {
      const next = structuredClone(people);
      for (const row of preview.valid) {
        if (row.duplicate && policy === "skip") continue;
        let person = next.find(
          (p) => p.name.toLowerCase() === row.name.toLowerCase(),
        );
        if (!person) {
          person = {
            id: crypto.randomUUID(),
            name: row.name,
            mode: "manual",
            birth: null,
            chart: null,
            overrides: [],
            stale: false,
            relationship: "",
            group: "",
            notes: "",
            updatedAt: new Date().toISOString(),
          };
          next.push(person);
        }
        person.overrides = person.overrides
          .filter((p) => p.point !== row.position.point)
          .concat(row.position);
        person.updatedAt = new Date().toISOString();
      }
      await onSave(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Импорт на позиции"
      subtitle="Пренесете познатите карти във вашия личен атлас."
      onClose={onClose}
      wide
    >
      <div className="form-body">
        <div className="import-steps">
          <span className={step === 1 ? "active" : ""}>1. Файл и колони</span>
          <ArrowRight size={15} />
          <span className={step === 2 ? "active" : ""}>2. Преглед и запис</span>
        </div>
        <label className="file-drop">
          <FileSpreadsheet size={30} />
          <strong>{fileName || "Изберете CSV файл"}</strong>
          <span>UTF-8 · до 5 MB · запетая или точка и запетая</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void load(e.target.files?.[0])}
          />
        </label>
        {step === 1 && headers.length > 0 && (
          <>
            <h3>Съпоставете колоните</h3>
            <div className="form-grid three">
              {FIELDS.map(([field, label, required]) => (
                <label className="field" key={field}>
                  {label}
                  {required ? " *" : " (по избор)"}
                  <select
                    value={mapping[field]}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field]: e.target.value }))
                    }
                  >
                    <option value="">
                      {required ? "Изберете колона" : "Не се използва"}
                    </option>
                    {headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="fine-print">
              Знаците могат да са на български или с индекс 0–11 (Овен–Риби).
              Точките приемат имена на български или идентификатори: sun, moon,
              asc и др.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <div className="notice">
              <Info size={17} />
              {preview.valid.length} валидни реда ·{" "}
              {preview.valid.filter((r) => r.duplicate).length} дубликата ·{" "}
              {preview.errors.length} грешки. Нищо не е записано още.
            </div>
            <label className="field">
              При дублирана позиция за същия човек
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
              >
                <option value="skip">Пропусни дубликатите</option>
                <option value="update">
                  Обнови — последният ред има предимство
                </option>
              </select>
            </label>
            {preview.errors.length > 0 && (
              <div className="error-box">
                {preview.errors.slice(0, 20).map((e) => (
                  <div key={e}>{e}</div>
                ))}
                {preview.errors.length > 20 && (
                  <div>… и още {preview.errors.length - 20} грешки</div>
                )}
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Човек</th>
                    <th>Точка</th>
                    <th>Позиция</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.valid.slice(0, 30).map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>
                        {POINTS.find((p) => p[0] === r.position.point)?.[1]}
                      </td>
                      <td>
                        {SIGNS[Math.floor(r.position.longitude! / 30)]} ·{" "}
                        {(r.position.longitude! % 30).toFixed(3)}°
                      </td>
                      <td>
                        {r.duplicate
                          ? "Дубликат"
                          : r.position.approximate
                            ? "Приблизително"
                            : "Потвърдена"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              Преглед на първите 30 реда. Ръчният импорт не замества
              оригиналните изчислени стойности — създава отделни корекции, които
              могат да се възстановят.
            </p>
          </>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button
          className="button secondary"
          onClick={step === 1 ? onClose : () => setStep(1)}
        >
          {step === 1 ? "Отказ" : "Назад"}
        </button>
        {step === 1 ? (
          <button
            className="button primary"
            disabled={
              !rows.length || FIELDS.some(([f, , r]) => r && !mapping[f])
            }
            onClick={() => setStep(2)}
          >
            Преглед <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button primary"
            disabled={
              busy ||
              !!preview.errors.length ||
              !preview.valid.some((r) => policy === "update" || !r.duplicate)
            }
            onClick={() => void commit()}
          >
            <Upload size={16} /> {busy ? "Запазване…" : "Импортирай позициите"}
          </button>
        )}
      </div>
    </Modal>
  );
}
