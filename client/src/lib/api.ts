const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  (typeof window !== "undefined" ? `${window.location.origin}` : "");

/** POST with JSON-Body */
export async function postJSON<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}

/** POST FormData (for Upload + Arrays) */
export async function postForm<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: form, ...init });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}

async function safeText(res: Response) {
  try { return await res.text(); } catch { return `HTTP ${res.status}`; }
}

export { API_BASE };