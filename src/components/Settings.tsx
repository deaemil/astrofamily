import { useEffect, useState, type ChangeEvent } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Database,
  CheckCircle2,
  Info,
  Save,
  ExternalLink,
} from "lucide-react";
import { PageHeading, Modal } from "./ui";
import { AspectOptions } from "./Compare";
import { download, validateBackup } from "../astro";
import { type AtlasData, type Settings as SettingsType } from "../types";
export default function Settings({
  data,
  cloudReady,
  email,
  serverOk,
  onSave,
  onRestore,
  onAuth,
  onSignOut,
  onImport,
}: {
  data: AtlasData;
  cloudReady: boolean;
  email?: string;
  serverOk: boolean;
  onSave: (s: SettingsType) => Promise<void>;
  onRestore: (d: AtlasData) => Promise<void>;
  onAuth: () => void;
  onSignOut: () => void;
  onImport: () => void;
}) {
  const [settings, setSettings] = useState(data.settings),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [restore, setRestore] = useState<AtlasData | null>(null);
  useEffect(() => setSettings(data.settings), [data.settings]);
  async function loadBackup(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 20_000_000) throw Error("Архивът е по-голям от 20 MB.");
      setRestore(validateBackup(JSON.parse(await f.text())));
      setError("");
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Файлът не е валиден JSON архив."
          : (e as Error).message,
      );
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave(settings);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const edit = (patch: Partial<SettingsType>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setSaved(false);
  };
  return (
    <>
      <PageHeading
        eyebrow="ВАШИЯТ АТЛАС. ВАШИТЕ ПРАВИЛА."
        title="Настройки"
        description="Изчисления, лични данни и сигурно място за вашите карти."
      />
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="section-heading">
            <h2>Изчисляване на картите</h2>
            <span className={`status-tag ${serverOk ? "" : "warning"}`}>
              {serverOk ? "Сървърът е достъпен" : "Сървърът не е достъпен"}
            </span>
          </div>
          <p className="field-help">
            Тропически зодиак · Геоцентрични позиции · Swiss Ephemeris
          </p>
          <div className="form-grid">
            <label className="field">
              Домова система по подразбиране
              <select
                value={settings.houses}
                onChange={(e) =>
                  edit({ houses: e.target.value as SettingsType["houses"] })
                }
              >
                <option value="P">Placidus</option>
                <option value="W">Whole Sign</option>
                <option value="E">Equal House</option>
              </select>
            </label>
            <label className="field">
              Северен лунен възел
              <select
                value={settings.node}
                onChange={(e) =>
                  edit({ node: e.target.value as SettingsType["node"] })
                }
              >
                <option value="true">Истински възел</option>
                <option value="mean">Среден възел</option>
              </select>
            </label>
          </div>
          <div className="notice">
            <Info size={16} />
            <span>
              Лилит: среден лунен апогей. Фортуна: дневна или нощна формула
              според положението на Слънцето. Промяна на домовете или възела
              маркира автоматичните карти за преизчисление.
            </span>
          </div>
          <h3>Аспекти и орбиси по подразбиране</h3>
          <AspectOptions
            rules={settings.aspects}
            onChange={(rules) => edit({ aspects: rules })}
          />
          <p className="fine-print">
            Начален орбис: 3° за всеки аспект. Ретроградността не променя
            геометричния аспект.
          </p>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="settings-save">
            <span className="success-label">
              {saved && (
                <>
                  <CheckCircle2 size={16} /> Настройките са запазени
                </>
              )}
            </span>
            <button
              className="button primary"
              onClick={() => void save()}
              disabled={busy}
            >
              <Save size={16} />
              {busy ? "Запазване…" : "Запази настройките"}
            </button>
          </div>
        </section>
        <aside className="settings-side">
          <section className="panel settings-panel">
            <div className="section-label">
              <ShieldCheck size={17} /> ЛИЧНО ПРОСТРАНСТВО
            </div>
            <h2>{email ? "Вашият облачен акаунт" : "Вашите данни са лични"}</h2>
            <p>
              {email
                ? email
                : "В момента данните се пазят само в този браузър. За постоянна облачна база и достъп от различни устройства използвайте Supabase."}
            </p>
            {email ? (
              <>
                <span className="status-tag">Supabase · Изолация с RLS</span>
                <button
                  className="button secondary full-width"
                  onClick={onSignOut}
                >
                  Изход от акаунта
                </button>
              </>
            ) : (
              <button className="button secondary full-width" onClick={onAuth}>
                {cloudReady ? "Вход с имейл" : "Настройване на облачен вход"}
              </button>
            )}
            {!cloudReady && (
              <div className="setup-instructions">
                <strong>Необходима е ваша настройка</strong>
                <ol>
                  <li>Създайте Supabase проект.</li>
                  <li>
                    Изпълнете <code>supabase/schema.sql</code> в SQL Editor.
                  </li>
                  <li>
                    Задайте <code>SUPABASE_URL</code> и публичния{" "}
                    <code>SUPABASE_ANON_KEY</code> в средата.
                  </li>
                  <li>Активирайте вход с имейл и рестартирайте сървъра.</li>
                </ol>
                <p>
                  Ключът service_role не се използва. Локалните данни не се
                  прехвърлят автоматично — използвайте JSON архив след вход.
                </p>
              </div>
            )}
            <p className="fine-print">
              Няма публично споделяне. При изход облачните данни се скриват;
              локалната база е отделна.
            </p>
          </section>
          <section className="panel settings-panel">
            <div className="section-label">
              <Database size={17} /> ДАННИ И АРХИВИ
            </div>
            <h2>Всичко остава с вас</h2>
            <p>
              Експортирайте личния си атлас или пренесете вече известни позиции.
            </p>
            <button
              className="button secondary full-width"
              onClick={() =>
                download(
                  "astro-atlas-arhiv.json",
                  JSON.stringify(data, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={16} /> Изтегли JSON архив
            </button>
            <label className="button secondary full-width file-button">
              <Upload size={16} /> Възстанови JSON архив
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => void loadBackup(e)}
              />
            </label>
            <button className="text-button" onClick={onImport}>
              <Upload size={15} /> CSV импорт на позиции
            </button>
            <p className="fine-print">
              CSV експортът е в „Позиции“ и в резултатите от сравненията.
              Архивите съдържат лични данни — пазете ги на сигурно място.
            </p>
          </section>
          <section className="license-note">
            <a
              href="https://github.com/deaemil/astrofamily"
              target="_blank"
              rel="noreferrer"
            >
              Изходен код · AGPL-3.0 <ExternalLink size={12} />
            </a>
            <span>
              Swiss Ephemeris © Astrodienst AG · Данни за места: Open-Meteo /
              GeoNames
            </span>
          </section>
        </aside>
      </div>
      {restore && (
        <Modal title="Възстановяване на архив" onClose={() => setRestore(null)}>
          <div className="form-body">
            <p>
              Архивът съдържа <strong>{restore.people.length} души</strong>.
              Възстановяването ще замести текущия ви атлас и настройки.
              Изтеглете архив на текущите данни, ако искате да ги запазите.
            </p>
            {error && <p className="error-box">{error}</p>}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setRestore(null)}
            >
              Отказ
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onRestore(restore);
                  setRestore(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Възстановяване…" : "Замести с данните от архива"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
