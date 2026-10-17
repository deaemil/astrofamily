import { useState, type FormEvent } from "react";
import { Mail, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "../store";
import { Modal } from "./ui";
export default function Auth({
  ready,
  onClose,
}: {
  ready: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!supabase) throw Error("Supabase не е настроен.");
      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            });
      if (error) throw error;
      if (data.session) onClose();
      else setMessage("Проверете имейла си за потвърждение на регистрацията.");
    } catch (e) {
      const text = (e as Error).message;
      setError(
        text.includes("Invalid login")
          ? "Невалиден имейл или парола."
          : text.includes("confirmed")
            ? "Първо потвърдете имейл адреса си."
            : text.includes("already")
              ? "Този имейл вече има акаунт. Опитайте вход."
              : "Входът не успя. Проверете връзката, данните и настройките за имейл в Supabase.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={ready ? "Вашето лично пространство" : "Свързване със Supabase"}
      subtitle="Вашите хора и карти са достъпни само за вас."
      onClose={onClose}
    >
      {ready ? (
        <form onSubmit={submit}>
          <div className="form-body">
            <div className="segmented auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Вход
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Създай акаунт
              </button>
            </div>
            <label className="field">
              Имейл
              <div className="input-icon">
                <Mail size={16} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vasheto@ime.bg"
                />
              </div>
            </label>
            <label className="field">
              Парола
              <div className="input-icon">
                <LockKeyhole size={16} />
                <input
                  type="password"
                  minLength={8}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Най-малко 8 символа"
                />
              </div>
            </label>
            <p className="fine-print">
              Локалният и облачният атлас са отделни. За прехвърляне използвайте
              JSON архив от „Настройки“.
            </p>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            {message && <div className="notice">{message}</div>}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Отказ
            </button>
            <button className="button primary" disabled={busy}>
              {busy
                ? "Свързване…"
                : mode === "login"
                  ? "Вход в атласа"
                  : "Създай акаунт"}
            </button>
          </div>
        </form>
      ) : (
        <div className="form-body">
          <div className="auth-illustration">
            <ShieldCheck size={45} />
          </div>
          <p>
            За вход и постоянна облачна база добавете <code>SUPABASE_URL</code>{" "}
            и публичния <code>SUPABASE_ANON_KEY</code> в настройките на средата
            и изпълнете <code>supabase/schema.sql</code> в проекта си.
          </p>
          <p>
            Подробните стъпки са в „Настройки“ и README. Дотогава локалният
            режим работи с реални изчисления и ръчни позиции.
          </p>
          <button className="button primary full-width" onClick={onClose}>
            Продължи в локален режим
          </button>
        </div>
      )}
    </Modal>
  );
}
