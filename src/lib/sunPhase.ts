import SunCalc from "suncalc";

export type SkyPhase =
  | "night"
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "sunset"
  | "dusk";

export type Coordinates = {
  lat: number;
  lon: number;
};

export type SkySnapshot = {
  phase: SkyPhase;
  source: "geolocation" | "fallback";
  altitudeDeg: number | null;
};

const MINUTES_AROUND_NOON = 50;

export function getSkySnapshot(date: Date, coords: Coordinates | null): SkySnapshot {
  if (!coords) {
    return {
      phase: getFallbackPhaseByLocalTime(date),
      source: "fallback",
      altitudeDeg: null,
    };
  }

  const times = SunCalc.getTimes(date, coords.lat, coords.lon);
  const position = SunCalc.getPosition(date, coords.lat, coords.lon);
  const altitudeDeg = (position.altitude * 180) / Math.PI;
  const now = date.getTime();

  if (now < times.dawn.getTime() || now >= times.dusk.getTime()) {
    return { phase: "night", source: "geolocation", altitudeDeg };
  }

  if (now < times.sunrise.getTime()) {
    return { phase: "dawn", source: "geolocation", altitudeDeg };
  }

  if (now >= times.sunset.getTime() && now < times.dusk.getTime()) {
    return { phase: "sunset", source: "geolocation", altitudeDeg };
  }

  const noonDeltaMinutes = Math.abs(now - times.solarNoon.getTime()) / 60000;
  if (noonDeltaMinutes <= MINUTES_AROUND_NOON) {
    return { phase: "noon", source: "geolocation", altitudeDeg };
  }

  if (now < times.solarNoon.getTime()) {
    return { phase: "morning", source: "geolocation", altitudeDeg };
  }

  if (now < times.sunset.getTime()) {
    return { phase: "afternoon", source: "geolocation", altitudeDeg };
  }

  return { phase: "dusk", source: "geolocation", altitudeDeg };
}

export function getFallbackPhaseByLocalTime(date: Date): SkyPhase {
  const hour = date.getHours();

  if (hour >= 0 && hour < 5) return "night";
  if (hour >= 5 && hour < 6) return "dawn";
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 13) return "noon";
  if (hour >= 13 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 18) return "sunset";
  if (hour >= 18 && hour < 19) return "dusk";
  return "night";
}

export function pickPoem(phase: SkyPhase, pool: Record<SkyPhase, string[]>, seed: number): string {
  const options = pool[phase];
  if (!options || options.length === 0) {
    return "Hom nay bau troi dang nghi, ban cung nghi nhe mot chut.";
  }
  const index = Math.abs(seed) % options.length;
  return options[index];
}

export function pickPoemAvoidRecent(
  phase: SkyPhase,
  pool: Record<SkyPhase, string[]>,
  seed: number,
  recent: string[],
): string {
  const options = pool[phase];
  if (!options || options.length === 0) {
    return "Hom nay bau troi dang nghi, ban cung nghi nhe mot chut.";
  }

  const recentSet = new Set(recent);
  const candidates = options.filter((line) => !recentSet.has(line));
  const selectionPool = candidates.length > 0 ? candidates : options;
  const index = Math.abs(seed) % selectionPool.length;
  return selectionPool[index];
}


