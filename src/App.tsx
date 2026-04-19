import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [permissionNote, setPermissionNote] = useState("Đang tìm vị trí của bạn...");
  const [now, setNow] = useState(() => new Date());
  const [poemSeed, setPoemSeed] = useState(() => Date.now());
  const [poem, setPoem] = useState("Trời đang đợi bạn mở mắt thật chậm...");
  const [isLocating, setIsLocating] = useState(true);
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

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      setPermissionNote("Trình duyệt không hỗ trợ vị trí. Đang dùng chế độ bầu trời ước lượng.");
      return;
    }

    setIsLocating(true);

    if ("permissions" in navigator) {
      void navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "denied") {
            setPermissionNote(
              "Trình duyệt đang chặn vị trí. Bạn bấm biểu tượng ổ khóa cạnh URL để bật lại quyền vị trí.",
            );
          }
        })
        .catch(() => {
          // Browser may not fully support the Permissions API.
        });
    }

    const setFromPosition = (position: GeolocationPosition) => {
      setCoords({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
      setIsLocating(false);
      setPermissionNote("Bầu trời đang chạy theo vị trí của bạn.");
    };

    const onFinalError = async (error: GeolocationPositionError) => {
      // If GPS is slow/unavailable, use coarse network location so sky phase still tracks roughly.
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        const approximateCoords = await fetchApproximateCoordsByIp();

        if (approximateCoords) {
          setCoords(approximateCoords);
          setIsLocating(false);
          setPermissionNote(
            "GPS đang chậm nên ứng dụng dùng vị trí ước lượng theo mạng. Bạn vẫn có thể bấm thử lại để lấy vị trí chính xác hơn.",
          );
          return;
        }
      }

      setCoords(null);
      setIsLocating(false);
      setPermissionNote(messageForGeoError(error));
    };

    // Step 1: try cached location quickly (works better on iOS after Maps has cached location).
    navigator.geolocation.getCurrentPosition(
      setFromPosition,
      () => {
        // Step 2: if no cache available, request a fresh location with a longer timeout.
        navigator.geolocation.getCurrentPosition(setFromPosition, onFinalError, {
          enableHighAccuracy: false,
          timeout: 60_000,
          maximumAge: 300_000,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 2_500,
        maximumAge: Infinity,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

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
        <button
          className="retry-button"
          type="button"
          onClick={requestLocation}
          disabled={isLocating}
        >
          {isLocating ? "Đang lấy vị trí..." : "Thử lại lấy vị trí"}
        </button>
        <p className="altitude">{describeSkyHeight(snapshot.altitudeDeg, snapshot.source)}</p>
      </section>
    </main>
  );
}

async function fetchApproximateCoordsByIp(): Promise<Coordinates | null> {
  const endpoints = [
    "https://ipwho.is/",
    "https://ipapi.co/json/",
  ];

  for (const endpoint of endpoints) {
    const coords = await fetchCoordsFromEndpoint(endpoint);
    if (coords) {
      return coords;
    }
  }

  return null;
}

async function fetchCoordsFromEndpoint(endpoint: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      latitude?: unknown;
      longitude?: unknown;
      lat?: unknown;
      lon?: unknown;
      success?: unknown;
    };

    if (payload.success === false) {
      return null;
    }

    const lat = Number(payload.latitude ?? payload.lat);
    const lon = Number(payload.longitude ?? payload.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return { lat, lon };
  } catch {
    return null;
  }
}

function messageForGeoError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Bạn chưa cấp vị trí. Vẫn có bầu trời nhẹ theo giờ địa phương.";
    case error.POSITION_UNAVAILABLE:
      return "Không lấy được vị trí hiện tại. Bạn thử bật Wi-Fi hoặc GPS rồi bấm thử lại.";
    case error.TIMEOUT:
      return "Lấy vị trí bị quá thời gian. Bạn bấm thử lại để ứng dụng xin vị trí lần nữa.";
    default:
      return "Không thể lấy vị trí lúc này. Ứng dụng đang chạy theo nhịp trời địa phương.";
  }
}

function describeSkyHeight(altitudeDeg: number | null, source: "geolocation" | "fallback") {
  if (source === "fallback" || altitudeDeg === null) {
    return "Đang dùng chế độ nhịp trời theo giờ địa phương.";
  }

  if (altitudeDeg > 45) return "Mặt trời đang lên cao và rõ.";
  if (altitudeDeg > 15) return "Mặt trời đang nghỉ trên tầng mây mỏng.";
  if (altitudeDeg > -5) return "Mặt trời đang sát đường chân trời.";
  return "Ánh sáng mặt trời đang lùi sau bầu trời.";
}

function labelForPhase(phase: ReturnType<typeof getSkySnapshot>["phase"]) {
  switch (phase) {
    case "night":
      return "Đêm yên";
    case "dawn":
      return "Bình minh";
    case "morning":
      return "Buổi sáng";
    case "noon":
      return "Giữa trưa";
    case "afternoon":
      return "Buổi chiều";
    case "sunset":
      return "Hoàng hôn";
    case "dusk":
      return "Chập choạng";
    default:
      return "Khoảng trời";
  }
}


