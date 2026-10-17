export interface Place {
  name: string;
  country: string;
  countryCode?: string;
  lat: number;
  lon: number;
  timezone: string;
}

function countryName(place: Place): string {
  if (!place.countryCode) return place.country;
  // Older Safari versions may not implement Intl.DisplayNames. A missing
  // translation must never turn a valid place response into a network error.
  try {
    if (typeof Intl.DisplayNames === "function") {
      return (
        new Intl.DisplayNames(["bg"], { type: "region" }).of(
          place.countryCode,
        ) || place.country
      );
    }
  } catch {
    /* Keep the service's country label. */
  }
  return place.country;
}

export async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<{ places: Place[]; warning: string }> {
  const response = await fetch(
    `/api/places?q=${encodeURIComponent(query.trim())}`,
    { signal },
  );
  if (!response.ok) throw new Error("places-unavailable");
  const data = await response.json();
  if (
    !data ||
    !Array.isArray(data.places) ||
    !data.places.every(
      (p: Place) =>
        p &&
        typeof p.name === "string" &&
        typeof p.country === "string" &&
        Number.isFinite(p.lat) &&
        Math.abs(p.lat) <= 90 &&
        Number.isFinite(p.lon) &&
        Math.abs(p.lon) <= 180 &&
        typeof p.timezone === "string",
    )
  )
    throw new Error("invalid-places-response");
  return {
    places: data.places.map((p: Place) => ({ ...p, country: countryName(p) })),
    warning: typeof data.warning === "string" ? data.warning : "",
  };
}
