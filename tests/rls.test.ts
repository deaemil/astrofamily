import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
// Actual PostgreSQL policy execution with Supabase's identity function emulated.
// This verifies the SQL policies, not a configured Supabase auth project.
const db = new PGlite();
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 insert into auth.users values ('${A}'),('${B}');`);
  await db.exec(
    readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
}, 20000);
afterAll(() => db.close());
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
describe("Row Level Security · реален PostgreSQL", () => {
  it("потребител А създава и вижда собствен документ", async () => {
    await asUser(A, async () => {
      await db.query(
        "insert into public.atlas_documents(owner_id,data) values ($1,$2)",
        [A, { people: [{ name: "Само за А" }] }],
      );
      const result = await db.query(
        "select owner_id from public.atlas_documents",
      );
      expect(result.rows).toEqual([{ owner_id: A }]);
    });
  });
  it("потребител Б не може да вижда или променя документа на А", async () => {
    await asUser(B, async () => {
      expect(
        (await db.query("select * from public.atlas_documents")).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            "update public.atlas_documents set data='{}' where owner_id=$1 returning owner_id",
            [A],
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            "delete from public.atlas_documents where owner_id=$1 returning owner_id",
            [A],
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it("потребител Б не може да създава документи от чуждо име", async () => {
    await asUser(B, async () => {
      await expect(
        db.query(
          "insert into public.atlas_documents(owner_id,data) values ($1,$2)",
          [A, {}],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });
  it("всеки потребител пази отделен атлас, без смесване на данни", async () => {
    await asUser(B, async () => {
      await db.query(
        "insert into public.atlas_documents(owner_id,data) values ($1,$2)",
        [B, { people: [{ name: "Само за Б" }] }],
      );
      expect(
        (await db.query("select owner_id from public.atlas_documents")).rows,
      ).toEqual([{ owner_id: B }]);
    });
    await asUser(A, async () =>
      expect(
        (await db.query("select owner_id from public.atlas_documents")).rows,
      ).toEqual([{ owner_id: A }]),
    );
  });
  it("анонимният клиент няма достъп до таблицата", async () => {
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select * from public.atlas_documents"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});
