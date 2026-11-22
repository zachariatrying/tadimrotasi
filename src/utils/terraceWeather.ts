export interface TerraceWeatherInfo {
  tempC: number;
  windKmh: number;
  isRaining: boolean;
  terraceSuitable: boolean;
  badgeText: string;
}

const weatherCache = new Map<string, TerraceWeatherInfo>();

/**
 * Uses the keyless, CORS-enabled Open-Meteo API (from the `public-apis` skill)
 * to compute a live outdoor/terrace dining verdict for any restaurant coordinate.
 */
export async function fetchTerraceWeather(lat: number, lng: number): Promise<TerraceWeatherInfo | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    };
    const cur = data.current;
    if (!cur || cur.temperature_2m === undefined) return null;

    const tempC = Math.round(cur.temperature_2m);
    const windKmh = Math.round(cur.wind_speed_10m ?? 0);
    const precip = cur.precipitation ?? 0;
    const code = cur.weather_code ?? 0;
    const isRaining = precip > 0.2 || code >= 51;
    const terraceSuitable = !isRaining && tempC >= 14 && tempC <= 33 && windKmh < 28;

    let badgeText = `${tempC}°C · Teras & Bahçe Uygun`;
    if (isRaining) {
      badgeText = `${tempC}°C · Yağışlı (İç Mekân Önerilir)`;
    } else if (tempC < 14) {
      badgeText = `${tempC}°C · Serin (Isıtıcılı Teras / İç Mekân)`;
    } else if (windKmh >= 28) {
      badgeText = `${tempC}°C · Rüzgarlı (${windKmh} km/s · İç Mekân)`;
    }

    const info: TerraceWeatherInfo = {
      tempC,
      windKmh,
      isRaining,
      terraceSuitable,
      badgeText,
    };
    weatherCache.set(key, info);
    return info;
  } catch {
    return null;
  }
}
