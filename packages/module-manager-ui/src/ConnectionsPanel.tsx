import React, { useEffect, useState } from "react";
import type { ModuleManager, ModuleRecord } from "module-manager";
export function useConnections(manager: ModuleManager) {
  const [items, setItems] = useState<ModuleRecord[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => setItems(await manager.list()))();
    const unsub = manager.subscribe(async () => {
      if (!mounted) return;
      setItems(await manager.list());
    });
    return () => { mounted = false; unsub(); };
  }, [manager]);
  return items;
}
export function ConnectionsPanel({ manager }: { manager: ModuleManager }) {
  const data = useConnections(manager);
  const dot = (s: ModuleRecord["status"]) => s === "connected" ? "bg-green-500" : s === "error" ? "bg-red-500" : "bg-gray-400";
  return (
    <div className="space-y-2">
      {data.map(m => (
        <div key={m.id} className="flex items-center justify-between border rounded p-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${dot(m.status)}`} aria-hidden />
            <div>
              <div className="font-medium">{m.name} <span className="text-xs text-muted-foreground">({m.kind})</span></div>
              {m.lastSync && <div className="text-xs text-muted-foreground">last sync: {new Date(m.lastSync).toLocaleString()}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="border rounded px-2 py-1 text-xs" onClick={() => manager.connect(m.id)}>Connect</button>
            <button className="border rounded px-2 py-1 text-xs" onClick={() => manager.disconnect(m.id)}>Disconnect</button>
            <button className="border rounded px-2 py-1 text-xs" onClick={() => alert("Configure (stub)")}>Configure</button>
          </div>
        </div>
      ))}
    </div>
  );
}
