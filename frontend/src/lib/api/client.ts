/** Orbit Earth backend API client (Go server on :8080). */

const DEFAULT_API_BASE = "http://localhost:8080";

export function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    DEFAULT_API_BASE
  );
}

export function wsBase(): string {
  const http = apiBase();
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}`;
  return http;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `API ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export async function healthz(): Promise<{ status: string; service: string }> {
  return apiFetch("/healthz");
}

export async function readyz(): Promise<{ status: string }> {
  return apiFetch("/readyz");
}

export type ApiAirport = {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  elevM: number;
  lat: number;
  lng: number;
};

export type ApiRunway = {
  id: string;
  airportIcao: string;
  ident: string;
  headingDeg: number;
  lengthM: number;
  widthM: number;
};

export type ApiWeather = {
  lat: number;
  lng: number;
  windFromDeg: number;
  windSpeedMs: number;
  tempC: number;
  pressureHpa: number;
  visibilityM: number;
  cloudsOctas: number;
  provider: string;
  observedAt: string;
};

export type GreatCircleResult = {
  distanceNm: number;
  bearingDeg: number;
  eteSec?: number;
  waypoints: Array<{ lat: number; lng: number }>;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthUser = {
  id?: string;
  email?: string;
  displayName?: string;
  role?: string;
};

export async function searchAirportsApi(
  q: string,
  signal?: AbortSignal,
): Promise<ApiAirport[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  const data = await apiFetch<{ airports: ApiAirport[] }>(
    `/api/v1/airports/search?${params}`,
    { signal },
  );
  return data.airports ?? [];
}

export async function nearestAirportsApi(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ApiAirport[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const data = await apiFetch<{ airports: ApiAirport[] }>(
    `/api/v1/airports/nearest?${params}`,
    { signal },
  );
  return data.airports ?? [];
}

export async function getAirportApi(
  icao: string,
  signal?: AbortSignal,
): Promise<ApiAirport | null> {
  try {
    return await apiFetch<ApiAirport>(
      `/api/v1/airports/${encodeURIComponent(icao)}`,
      { signal },
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function listRunwaysApi(
  icao: string,
  signal?: AbortSignal,
): Promise<ApiRunway[]> {
  const data = await apiFetch<{ runways: ApiRunway[] }>(
    `/api/v1/airports/${encodeURIComponent(icao)}/runways`,
    { signal },
  );
  return data.runways ?? [];
}

export async function getWeatherApi(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ApiWeather> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return apiFetch(`/api/v1/weather?${params}`, { signal });
}

export async function greatCircleApi(opts: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  cruiseMs?: number;
  signal?: AbortSignal;
}): Promise<GreatCircleResult> {
  const params = new URLSearchParams({
    fromLat: String(opts.fromLat),
    fromLng: String(opts.fromLng),
    toLat: String(opts.toLat),
    toLng: String(opts.toLng),
    cruiseMs: String(opts.cruiseMs ?? 120),
  });
  return apiFetch(`/api/v1/navigation/great-circle?${params}`, {
    signal: opts.signal,
  });
}

export async function registerApi(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  return apiFetch("/api/v1/auth/register", { method: "POST", body: input });
}

export async function loginApi(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  return apiFetch("/api/v1/auth/login", { method: "POST", body: input });
}

export async function refreshApi(
  refreshToken: string,
): Promise<AuthTokens> {
  return apiFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function multiplayerWsUrl(token: string, callsign: string): string {
  const params = new URLSearchParams({ token, callsign });
  return `${wsBase()}/ws/v1/multiplayer?${params}`;
}
