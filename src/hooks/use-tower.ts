import { useQuery } from "@tanstack/react-query";
import type { Tower } from "../data/live";

/** Données réelles de NexusTower (+ HomeboxServer), relues toutes les 10 s. null si injoignable. */
export function useTower() {
  const q = useQuery({
    queryKey: ["tower"],
    queryFn: async (): Promise<Tower> => {
      const res = await fetch("/api/tower", { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 10_000,
    retry: 1,
  });
  return { tower: q.data ?? null, connected: q.isSuccess && !q.isError, loading: q.isLoading };
}
