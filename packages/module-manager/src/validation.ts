export function normalizeCapabilities(raw: any): Array<{id: string; label: string}> | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw) && raw.every(x => typeof x === "string")) {
    return raw.map((id: string) => ({ id, label: id }));
  }
  if (Array.isArray(raw) && raw.every(x => x && typeof x.id === "string" && typeof x.label === "string")) {
    return raw as Array<{id:string;label:string}>;
  }
  return undefined;
}
