import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./places";
const place = {
  name: "Tokyo",
  country: "JP",
  countryCode: "JP",
  lat: 35.6895,
  lon: 139.69171,
  timezone: "Asia/Tokyo",
};
afterEach(() => vi.unstubAllGlobals());
describe("търсене на място", () => {
  it("превежда държавата и пази реалните координати", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ places: [place], warning: null })),
    );
    const result = await searchPlaces(" Tokyo ", new AbortController().signal);
    expect(result.places[0]).toMatchObject({ ...place, country: "Япония" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/places?q=Tokyo",
      expect.anything(),
    );
  });
  it("работи и без Intl.DisplayNames в по-стар Safari", async () => {
    vi.stubGlobal("Intl", {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ places: [place] })),
    );
    expect(
      (await searchPlaces("Tokyo", new AbortController().signal)).places[0],
    ).toMatchObject(place);
  });
  it("не приема HTML страница вместо API отговор", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("<!doctype html><title>Vite</title>")),
    );
    await expect(
      searchPlaces("София", new AbortController().signal),
    ).rejects.toThrow();
  });
  it("разграничава неработещ сървър от празен списък", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    await expect(
      searchPlaces("София", new AbortController().signal),
    ).rejects.toThrow("places-unavailable");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ places: [], warning: null })),
    );
    expect(
      (await searchPlaces("Няма такъв град", new AbortController().signal))
        .places,
    ).toEqual([]);
  });
  it("отхвърля невалидни координати, без да предлага грешно място", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ places: [{ ...place, lat: 100 }] })),
    );
    await expect(
      searchPlaces("Tokyo", new AbortController().signal),
    ).rejects.toThrow("invalid-places-response");
  });
});
