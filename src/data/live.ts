// Données réelles de la baie : l'API de NexusTower (/api/tower), qui relaie les voyants
// de HomeboxServer (vue d'ensemble) et décrit les projets (étages) et les agents Claude Code.
import { DEFAULT_RACK, SlotConfig, UnitId } from "./rackConfig";

export type Level = "ok" | "warn" | "crit" | "off";

export interface Tile { key: string; label: string; level: Level; value: string; note: string | null; group: string | null }
interface Agent { status: "working" | "waiting" | "idle" | "away"; costUSD: number | null }
interface Floor {
  name: string;
  isLobby: boolean;
  homebox: { status: string; up: boolean; port: number | null; busy: boolean } | null;
  agents: Agent[];
  totalAgents: number;
}
export interface Tower {
  generatedAt: string;
  stats: { floors: number; agents: number; working: number };
  health: { level: Level; problems: number; issues: string[]; tiles: Tile[]; generatedAt: string | null } | null;
  cost: { currentMonth: string; month: number; history: { month: string; usd: number }[]; byFloor: { name: string; usd: number }[] } | null;
  homebox: { connected: boolean; error: string | null };
  floors: Floor[];
}

/** Ce que chaque unité de la baie affiche réellement. */
export type LiveSource = "network" | "firewall" | "machine" | "storage" | "agents" | "costs" | "tower" | "backup" | "watchdog" | "none";

export const LIVE_SOURCE_LABEL: Record<LiveSource, string> = {
  network: "Projets en ligne (registre HomeboxServer)",
  firewall: "Pare-feu et SSH (HomeboxServer)",
  machine: "Processeur, mémoire, température (HomeboxServer)",
  storage: "Disque, SMART et conteneurs (HomeboxServer)",
  agents: "Agents Claude Code (NexusTower)",
  costs: "Coûts des agents (NexusTower)",
  tower: "Étages de la tour (NexusTower)",
  backup: "Sauvegardes (HomeboxServer)",
  watchdog: "Problèmes en cours (HomeboxServer)",
  none: "Aucune mesure réelle",
};

const DEFAULT_SOURCES: Record<UnitId, LiveSource> = {
  U1: "network", U2: "firewall", U3: "machine", U4: "storage", U5: "agents",
  U6: "costs", U7: "tower", U8: "backup", U9: "watchdog", U10: "none",
};

/** La source d'une unité : celle de la baie par défaut tant que l'équipement n'a pas changé de type. */
export function sourceOf(unit: UnitId, config: SlotConfig): LiveSource {
  return config.type === DEFAULT_RACK[unit].type ? DEFAULT_SOURCES[unit] : "none";
}

export interface LiveMetric { label: string; value: string; level: Level; note?: string | null }
export interface LiveUnit {
  level: Level;
  metrics: LiveMetric[];
  tags: string[];
  /** Diodes de la façade (ports, disques…) : une par élément réel. */
  leds: { label: string; level: Level; active?: boolean }[];
  /** Taux d'activité 0–1 (barre de charge). */
  load: number | null;
}

const RANK: Record<Level, number> = { off: 0, ok: 1, warn: 2, crit: 3 };
export const worst = (levels: Level[]): Level => levels.reduce<Level>((a, b) => (RANK[b] > RANK[a] ? b : a), "off");
export const LEVEL_COLOR: Record<Level, string> = { ok: "#22c55e", warn: "#f59e0b", crit: "#ef4444", off: "#475569" };
export const LEVEL_LABEL: Record<Level, string> = { ok: "OK", warn: "À SURVEILLER", crit: "CRITIQUE", off: "—" };

const pct = (v: string | undefined) => {
  const n = parseFloat((v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(1, n / 100) : null;
};
const usd = (n: number) => `${n.toFixed(2)} $`;

export function liveUnit(source: LiveSource, t: Tower | null): LiveUnit | null {
  if (!t || source === "none") return null;
  const tiles = new Map((t.health?.tiles ?? []).map((x) => [x.key, x]));
  const fromTiles = (keys: string[]): LiveMetric[] =>
    keys.flatMap((k) => {
      const x = tiles.get(k);
      return x ? [{ label: x.label, value: x.value, level: x.level, note: x.note }] : [];
    });
  const levelOf = (m: LiveMetric[]) => worst(m.map((x) => x.level));
  const floors = t.floors.filter((f) => !f.isLobby);
  const agents = t.floors.flatMap((f) => f.agents);
  const count = (s: Agent["status"]) => agents.filter((a) => a.status === s).length;

  switch (source) {
    case "network": {
      const registered = floors.filter((f) => f.homebox);
      const up = registered.filter((f) => f.homebox!.up);
      const metrics: LiveMetric[] = [
        { label: "Projets en ligne", value: `${up.length}/${registered.length}`, level: t.homebox.connected ? "ok" : "crit" },
        ...fromTiles(["services", "docker"]),
        { label: "Registre", value: t.homebox.connected ? "joignable" : "injoignable", level: t.homebox.connected ? "ok" : "crit", note: t.homebox.error },
      ];
      return {
        level: levelOf(metrics),
        metrics,
        tags: up.map((f) => `${f.name}${f.homebox!.port ? ` :${f.homebox!.port}` : ""}`),
        leds: registered.map((f) => ({ label: f.name, level: f.homebox!.up ? "ok" : "off", active: f.homebox!.busy })),
        load: registered.length ? up.length / registered.length : null,
      };
    }
    case "firewall": {
      const metrics = [...fromTiles(["firewall", "ssh"]), { label: "Problèmes", value: String(t.health?.problems ?? "—"), level: (t.health?.problems ? "warn" : "ok") as Level }];
      return { level: levelOf(metrics.slice(0, 2)), metrics, tags: ["UFW", "fail2ban", "SSH"], leds: metrics.map((m) => ({ label: m.label, level: m.level })), load: null };
    }
    case "machine": {
      const metrics = fromTiles(["cpu", "mem", "temp", "updates"]);
      return { level: levelOf(metrics), metrics, tags: ["homebox-3"], leds: metrics.map((m) => ({ label: m.label, level: m.level })), load: pct(tiles.get("cpu")?.value) };
    }
    case "storage": {
      const metrics = fromTiles(["disk", "smart", "docker", "services"]);
      return { level: levelOf(metrics), metrics, tags: ["Docker", "systemd"], leds: metrics.map((m) => ({ label: m.label, level: m.level })), load: pct(tiles.get("disk")?.value) };
    }
    case "agents": {
      const metrics: LiveMetric[] = [
        { label: "Au travail", value: String(count("working")), level: "ok" },
        { label: "Attendent ta réponse", value: String(count("waiting")), level: count("waiting") ? "warn" : "ok" },
        { label: "En pause", value: String(count("idle")), level: "off" },
        { label: "Au vestiaire", value: String(count("away")), level: "off" },
      ];
      const busy = floors.filter((f) => f.agents.some((a) => a.status === "working" || a.status === "waiting")).map((f) => f.name);
      return {
        level: count("waiting") ? "warn" : "ok",
        metrics,
        tags: busy,
        leds: agents.slice(0, 24).map((a) => ({ label: a.status, level: a.status === "waiting" ? "warn" : a.status === "working" ? "ok" : "off", active: a.status === "working" })),
        load: agents.length ? (count("working") + count("waiting")) / agents.length : 0,
      };
    }
    case "costs": {
      if (!t.cost) return null;
      // Mois précédent = le plus récent avant le mois en cours (l'historique n'est pas forcément trié)
      const prev = t.cost.history.filter((h) => h.month < t.cost!.currentMonth).sort((a, b) => a.month.localeCompare(b.month)).at(-1);
      const peak = Math.max(t.cost.month, ...t.cost.history.map((h) => h.usd));
      const top = [...t.cost.byFloor].sort((a, b) => b.usd - a.usd);
      const metrics: LiveMetric[] = [
        { label: `Coût ${t.cost.currentMonth}`, value: usd(t.cost.month), level: "ok" },
        { label: prev ? `Coût ${prev.month}` : "Mois précédent", value: prev ? usd(prev.usd) : "—", level: "off" },
        { label: "Étage le plus coûteux", value: top[0]?.name ?? "—", level: "off", note: top[0] ? usd(top[0].usd) : null },
        { label: "Agents", value: String(t.stats.agents), level: "off" },
      ];
      // Barre de charge : dépense du mois rapportée au mois le plus cher de l'historique
      return { level: "ok", metrics, tags: top.slice(0, 5).map((f) => `${f.name} ${usd(f.usd)}`), leds: [], load: peak > 0 ? t.cost.month / peak : null };
    }
    case "tower": {
      const metrics: LiveMetric[] = [
        { label: "Étages", value: String(t.stats.floors), level: "ok" },
        { label: "Projets actifs", value: String(floors.filter((f) => f.homebox?.status === "active").length), level: "ok" },
        { label: "En pause", value: String(floors.filter((f) => f.homebox?.status === "paused").length), level: "off" },
        { label: "Sessions", value: String(t.stats.agents), level: "off" },
      ];
      return {
        level: "ok", metrics, tags: ["Devstream Solutions"],
        leds: floors.map((f) => ({ label: f.name, level: f.homebox?.status === "active" ? "ok" : "off" })),
        load: null,
      };
    }
    case "backup": {
      const metrics = fromTiles(["backup", "offsite", "disk", "smart"]);
      return { level: levelOf(metrics), metrics, tags: ["Sauvegardes locales"], leds: metrics.map((m) => ({ label: m.label, level: m.level })), load: pct(tiles.get("disk")?.value) };
    }
    case "watchdog": {
      if (!t.health) return { level: "crit", metrics: [{ label: "Vue d'ensemble", value: "injoignable", level: "crit" }], tags: [], leds: [], load: null };
      const metrics: LiveMetric[] = [
        { label: "Niveau global", value: LEVEL_LABEL[t.health.level], level: t.health.level },
        { label: "Problèmes", value: String(t.health.problems), level: t.health.problems ? t.health.level : "ok" },
        { label: "Voyants", value: `${t.health.tiles.filter((x) => x.level === "ok").length}/${t.health.tiles.length} OK`, level: "off" },
        { label: "Relevé", value: t.health.generatedAt ? new Date(t.health.generatedAt).toLocaleTimeString("fr-FR") : "—", level: "off" },
      ];
      return { level: t.health.level, metrics, tags: t.health.issues, leds: t.health.tiles.map((x) => ({ label: x.label, level: x.level })), load: null };
    }
  }
}
