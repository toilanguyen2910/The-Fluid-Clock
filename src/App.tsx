import { useEffect, useMemo, useRef, useState } from "react";
import { poemsByPhase } from "./content/poems.vi";
import {
  getSkySnapshot,
  pickPoemAvoidRecent,
  type Coordinates,
  type SkyPhase,
} from "./lib/sunPhase";

const TICK_INTERVAL_MS = 60_000;
const POEM_ROTATION_MS = 4 * 60_000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);

    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default function App() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionNote, setPermissionNote] = useState("Dang tim vi tri cua ban...");
  const [now, setNow] = useState(() => new Date());
  const [poemSeed, setPoemSeed] = useState(() => Date.now());
  const [poem, setPoem] = useState("Troi dang doi ban mo mat that cham...");
  const recentPoems = useRef<Record<SkyPhase, string[]>>({
    night: [],
    dawn: [],
    morning: [],
    noon: [],
    afternoon: [],
    sunset: [],
    dusk: [],
  });
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermissionNote("Trinh duyet khong ho tro vi tri. Dang dung che do bau troi uoc luong.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setPermissionNote("Bau troi dang chay theo vi tri cua ban.");
      },
      () => {
        setPermissionNote("Ban chua cap vi tri. Van co bau troi nhe theo gio dia phuong.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
      },
    );
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const rotation = window.setInterval(() => setPoemSeed(Date.now()), POEM_ROTATION_MS);
    return () => window.clearInterval(rotation);
  }, []);

  const snapshot = useMemo(() => getSkySnapshot(now, coords), [coords, now]);

  useEffect(() => {
    const recent = recentPoems.current[snapshot.phase].slice(0, 4);
    const nextPoem = pickPoemAvoidRecent(snapshot.phase, poemsByPhase, poemSeed, recent);
    recentPoems.current[snapshot.phase] = [nextPoem, ...recent.filter((line) => line !== nextPoem)].slice(0, 4);
    setPoem(nextPoem);
  }, [poemSeed, snapshot.phase]);

  return (
    <main
      className={`app phase-${snapshot.phase} ${reduceMotion ? "reduce-motion" : ""}`}
      aria-live="polite"
    >
      <div className="star-field" aria-hidden="true" />
      <div className="star-field second" aria-hidden="true" />
      <div className="celestial sun" aria-hidden="true" />
      <div className="celestial moon" aria-hidden="true" />
      <div className="cloud-layer" aria-hidden="true" />
      <div className="cloud-layer second" aria-hidden="true" />

      <section className="panel">
        <p className="phase-label">{labelForPhase(snapshot.phase)}</p>
        <p className="poem">{poem}</p>
        <p className="helper">{permissionNote}</p>
        <p className="altitude">{describeSkyHeight(snapshot.altitudeDeg, snapshot.source)}</p>
      </section>
    </main>
  );
}

function describeSkyHeight(altitudeDeg: number | null, source: "geolocation" | "fallback") {
  if (source === "fallback" || altitudeDeg === null) {
    return "Dang dung che do nhip troi theo gio dia phuong.";
  }

  if (altitudeDeg > 45) return "Mat troi dang len cao va ro.";
  if (altitudeDeg > 15) return "Mat troi dang nghi tren tang may mong.";
  if (altitudeDeg > -5) return "Mat troi dang sat duong chan troi.";
  return "Anh sang mat troi dang lui sau bau troi.";
}

function labelForPhase(phase: ReturnType<typeof getSkySnapshot>["phase"]) {
  switch (phase) {
    case "night":
      return "Dem yen";
    case "dawn":
      return "Binh minh";
    case "morning":
      return "Buoi sang";
    case "noon":
      return "Giua trua";
    case "afternoon":
      return "Buoi chieu";
    case "sunset":
      return "Hoang hon";
    case "dusk":
      return "Chap choang";
    default:
      return "Khoang troi";
  }
}


