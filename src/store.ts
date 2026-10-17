import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { EMPTY, type AtlasData } from "./types";
import { validateBackup } from "./astro";
const LOCAL_KEY = "astro-atlas-local-v1";
export let supabase: SupabaseClient | null = null;
export async function initCloud() {
  const r = await fetch("/api/config");
  if (!r.ok)
    throw new Error("Сървърът не е достъпен. Стартирайте npm run dev.");
  const c = await r.json();
  if (c.supabaseUrl && c.supabaseKey)
    supabase = createClient(c.supabaseUrl, c.supabaseKey);
  return supabase;
}
export function readLocal(): AtlasData {
  try {
    const value = localStorage.getItem(LOCAL_KEY);
    return value ? validateBackup(JSON.parse(value)) : structuredClone(EMPTY);
  } catch {
    throw new Error(
      "Локалният атлас не може да бъде прочетен. Съществуващите данни не са променени. Проверете достъпа до хранилището на браузъра.",
    );
  }
}
export async function loadData(session: Session | null): Promise<AtlasData> {
  if (!session) return readLocal();
  const { data, error } = await supabase!
    .from("atlas_documents")
    .select("data")
    .eq("owner_id", session.user.id)
    .maybeSingle();
  if (error)
    throw new Error(
      "Облачната база е недостъпна. Проверете Supabase настройките и изпълнете SQL миграцията.",
    );
  return data ? validateBackup(data.data) : structuredClone(EMPTY);
}
export async function saveData(data: AtlasData, session: Session | null) {
  if (!session) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        "Записът в браузъра не успя. Проверете свободното място и разрешението за локално съхранение. Предишните данни са запазени.",
      );
    }
    return;
  }
  const { error } = await supabase!.from("atlas_documents").upsert({
    owner_id: session.user.id,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error)
    throw new Error(
      "Записът в Supabase не успя. Проверете връзката и RLS настройките.",
    );
}
