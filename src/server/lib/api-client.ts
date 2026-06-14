const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, credentials: "include" });
  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await apiFetch(path, init);
  if (!res.ok) return null;
  return res.json();
}
