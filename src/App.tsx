import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  Network,
  Orbit,
  Settings as SettingsIcon,
  ChevronRight,
  Menu,
  X,
  LockKeyhole,
  Cloud,
  Check,
  AlertCircle,
  Sparkles,
  Plus,
  LogIn,
  Info,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  EMPTY,
  type AtlasData,
  type Person,
  type Settings as SettingsType,
} from "./types";
import { initCloud, loadData, saveData, supabase } from "./store";
import People from "./components/People";
import Profile from "./components/Profile";
import PersonForm from "./components/PersonForm";
import Compare from "./components/Compare";
import Repeats from "./components/Repeats";
import Settings from "./components/Settings";
import ImportModal from "./components/ImportModal";
import Auth from "./components/Auth";
import { Modal } from "./components/ui";
const NAV = [
  ["people", "Хора", Users],
  ["compare", "Сравнение", Network],
  ["repeats", "Повторения", Orbit],
  ["settings", "Настройки", SettingsIcon],
] as const;
export default function App() {
  const [data, setData] = useState<AtlasData>(structuredClone(EMPTY)),
    [session, setSession] = useState<Session | null>(null),
    [cloudReady, setCloudReady] = useState(false),
    [loading, setLoading] = useState(true),
    [loadFailed, setLoadFailed] = useState(false),
    [serverOk, setServerOk] = useState(false);
  const [page, setPage] = useState("people"),
    [profileId, setProfileId] = useState(""),
    [compareId, setCompareId] = useState(""),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<
      "add" | "edit" | "import" | "auth" | "delete" | null
    >(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const sessionRef = useRef<Session | null>(null),
    dataRef = useRef(data),
    loadingRef = useRef(true),
    loadEpoch = useRef(0);
  const load = useCallback(async (s: Session | null) => {
    const epoch = ++loadEpoch.current;
    loadingRef.current = true;
    sessionRef.current = s;
    setSession(s);
    setLoading(true);
    setLoadFailed(false);
    dataRef.current = structuredClone(EMPTY);
    setData(structuredClone(EMPTY));
    setProfileId("");
    setError("");
    try {
      const d = await loadData(s);
      if (epoch !== loadEpoch.current) return;
      sessionRef.current = s;
      setSession(s);
      dataRef.current = d;
      setData(d);
    } catch (e) {
      if (epoch === loadEpoch.current) {
        setLoadFailed(true);
        setError((e as Error).message);
      }
    } finally {
      if (epoch === loadEpoch.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    let alive = true;
    let unsubscribe: () => void = () => {};
    void (async () => {
      try {
        const client = await initCloud();
        if (!alive) return;
        setCloudReady(!!client);
        const s = client ? (await client.auth.getSession()).data.session : null;
        await load(s);
        if (client) {
          const { data } = client.auth.onAuthStateChange((event, next) => {
            if (event === "TOKEN_REFRESHED") {
              sessionRef.current = next;
              setSession(next);
              return;
            }
            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
              if (next?.user.id !== sessionRef.current?.user.id)
                setTimeout(() => {
                  if (alive) void load(next);
                }, 0);
            }
          });
          unsubscribe = () => data.subscription.unsubscribe();
        }
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          await load(null);
        }
      }
      try {
        const r = await fetch("/api/health");
        if (alive) setServerOk(r.ok);
      } catch {
        if (alive) setServerOk(false);
      }
    })();
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function commit(next: AtlasData, message = "Промените са запазени") {
    if (loadingRef.current || loadFailed)
      throw Error("Първо заредете успешно текущата база данни.");
    const epoch = loadEpoch.current;
    const targetSession = sessionRef.current;
    setSaving(true);
    setError("");
    try {
      await saveData(next, targetSession);
      if (epoch !== loadEpoch.current)
        throw Error("Акаунтът е променен. Заредете данните отново.");
      dataRef.current = next;
      setData(next);
      setToast(message);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }
  function navigate(next: string) {
    setPage(next);
    setProfileId("");
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const profile = data.people.find((p) => p.id === profileId);
  const close = useCallback(() => setModal(null), []);
  const savePerson = async (p: Person) => {
    const next = {
      ...dataRef.current,
      people: dataRef.current.people.some((x) => x.id === p.id)
        ? dataRef.current.people.map((x) => (x.id === p.id ? p : x))
        : [...dataRef.current.people, p],
    };
    await commit(next, `${p.name} — данните са запазени`);
    setModal(null);
    setProfileId(p.id);
    setPage("people");
  };
  const saveSettings = async (settings: SettingsType) => {
    const old = dataRef.current.settings;
    const changed =
      settings.houses !== old.houses || settings.node !== old.node;
    await commit(
      {
        ...dataRef.current,
        settings,
        people: dataRef.current.people.map((p) =>
          changed && p.mode === "automatic" ? { ...p, stale: true } : p,
        ),
      },
      "Настройките са запазени",
    );
  };
  return (
    <div className="app-shell">
      <div className="mobile-header">
        <button
          className="icon-button"
          aria-label="Отвори навигацията"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
        <span className="mobile-logo">✧ Астро Атлас</span>
        <button
          className="icon-button"
          aria-label="Добави човек"
          onClick={() => setModal("add")}
        >
          <Plus />
        </button>
      </div>
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <button className="brand" onClick={() => navigate("people")}>
          <span className="brand-mark">✧</span>
          <span>
            Астро Атлас<small>БЛИЗКИ ПОД ЕДНО НЕБЕ</small>
          </span>
        </button>
        <button
          className="mobile-close icon-button"
          aria-label="Затвори навигацията"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="sidebar-section-label">ЛИЧНО ПРОСТРАНСТВО</div>
        <nav>
          {NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-label={label}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={19} strokeWidth={1.6} />
              <span>{label}</span>
              {id === "people" && data.people.length > 0 ? (
                <span className="nav-count">{data.people.length}</span>
              ) : page === id ? (
                <span className="nav-active-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-inspiration">
          <span className="inspiration-stars">
            ✦ <i>·</i> ✧
          </span>
          <p>
            Някои връзки са
            <br />
            написани в звездите.
            <br />
            <em>Други откриваме сами.</em>
          </p>
          <div className="inspiration-line" />
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-line">
            <LockKeyhole size={13} /> Вашият атлас е личен
          </div>
          <button
            className="account-card"
            onClick={() => (session ? navigate("settings") : setModal("auth"))}
          >
            <span className="account-avatar">
              {session ? (
                session.user.email?.[0]?.toUpperCase()
              ) : (
                <Users size={18} />
              )}
            </span>
            <span>
              <strong>{session ? "Личен акаунт" : "Моят атлас"}</strong>
              <small>
                {session
                  ? "Синхронизирано със Supabase"
                  : "Локално пространство"}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
          <span className="sidebar-version">
            АСТРО АТЛАС <span>✧</span> ВЕРСИЯ 1.0
          </span>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <div className="breadcrumb">
            Моят атлас <ChevronRight size={13} />
            <strong>{NAV.find((n) => n[0] === page)?.[1]}</strong>
            {profile && (
              <>
                <ChevronRight size={13} />
                <span>{profile.name}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className={`save-indicator ${error ? "has-error" : ""}`}>
              {error ? (
                <AlertCircle size={13} />
              ) : saving ? (
                <Cloud size={13} />
              ) : (
                <Check size={13} />
              )}
              <span>
                {error
                  ? "Има грешка"
                  : saving
                    ? "Запазване…"
                    : session
                      ? "Облачен атлас"
                      : "Локален атлас"}
              </span>
            </span>
            {!session && (
              <button className="topbar-login" onClick={() => setModal("auth")}>
                <LogIn size={14} />
                <span>Вход с имейл</span>
              </button>
            )}
          </div>
        </div>
        <div className="page-content">
          {error && (
            <div className="error-box global-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              {loadFailed && (
                <button
                  className="button secondary small"
                  onClick={() => void load(sessionRef.current)}
                >
                  Опитай отново
                </button>
              )}
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <Sparkles className="spin" />
              <p>Подреждаме вашите звезди…</p>
            </div>
          ) : loadFailed ? (
            <div className="panel small-empty">
              Данните не са заредени. Записът е блокиран, за да се запази
              съществуващият атлас.
            </div>
          ) : page === "people" ? (
            profile ? (
              <Profile
                person={profile}
                settings={data.settings}
                onBack={() => setProfileId("")}
                onEdit={() => setModal("edit")}
                onDelete={() => setModal("delete")}
                onCompare={() => {
                  setCompareId(profile.id);
                  navigate("compare");
                }}
              />
            ) : (
              <People
                people={data.people}
                onAdd={() => setModal("add")}
                onOpen={setProfileId}
                onImport={() => setModal("import")}
                onCompare={() => navigate("compare")}
                onRepeats={() => navigate("repeats")}
              />
            )
          ) : page === "compare" ? (
            <Compare
              key={compareId}
              people={data.people}
              settings={data.settings}
              initialId={compareId}
              onAdd={() => setModal("add")}
            />
          ) : page === "repeats" ? (
            <Repeats people={data.people} onAdd={() => setModal("add")} />
          ) : (
            <Settings
              data={data}
              cloudReady={cloudReady}
              email={session?.user.email}
              serverOk={serverOk}
              onSave={saveSettings}
              onRestore={(d) => commit(d, "Архивът е възстановен")}
              onAuth={() => setModal("auth")}
              onSignOut={() => {
                void supabase?.auth.signOut().then(({ error }) => {
                  if (error) setError("Изходът не успя. Проверете връзката.");
                });
              }}
              onImport={() => setModal("import")}
            />
          )}
        </div>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Астро Атлас</span>
          <span>
            <Info size={12} /> Пространство за връзки и любопитство
          </span>
        </footer>
      </main>
      {(modal === "add" || modal === "edit") && (
        <PersonForm
          person={modal === "edit" ? profile : undefined}
          settings={data.settings}
          onClose={close}
          onSave={savePerson}
        />
      )}{" "}
      {modal === "import" && (
        <ImportModal
          people={data.people}
          onClose={close}
          onSave={async (people) => {
            await commit(
              { ...dataRef.current, people },
              "Позициите са импортирани",
            );
            setModal(null);
          }}
        />
      )}
      {modal === "auth" && <Auth ready={cloudReady} onClose={close} />}{" "}
      {modal === "delete" && profile && (
        <Modal title={`Изтриване на ${profile.name}?`} onClose={close}>
          <div className="form-body">
            <p>
              Ще бъдат изтрити човекът, неговата карта и ръчните корекции.
              Сравненията и повторенията ще се обновят. Това действие не може да
              се отмени.
            </p>
          </div>
          <div className="modal-footer">
            <button className="button secondary" onClick={close}>
              Отказ
            </button>
            <button
              className="button destructive"
              disabled={saving}
              onClick={async () => {
                try {
                  await commit(
                    {
                      ...dataRef.current,
                      people: dataRef.current.people.filter(
                        (p) => p.id !== profile.id,
                      ),
                    },
                    "Човекът е изтрит",
                  );
                  setProfileId("");
                  setModal(null);
                } catch {}
              }}
            >
              {saving ? "Изтриване…" : "Да, изтрий човека"}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Затвори съобщението" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
