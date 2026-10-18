import { useState, useEffect } from "react";
import { SlotConfig, getMetrics } from "../data/rackConfig";

export function useLiveMetrics(config: SlotConfig | null) {
  const [metrics, setMetrics] = useState<Record<number, string | number>>({});

  useEffect(() => {
    if (!config) return;
    const specs = getMetrics(config);

    const generate = () => {
      const m: Record<number, string | number> = {};
      specs.forEach((s, i) => { m[i] = s.generate(); });
      setMetrics(m);
    };

    generate();
    const id = setInterval(generate, 2000);
    return () => clearInterval(id);
  }, [config?.type, (config as any)?.portCount, (config as any)?.driveCount, (config as any)?.vramGB]);

  return { metrics, specs: config ? getMetrics(config) : [] };
}
