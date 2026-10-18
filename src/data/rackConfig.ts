export type DeviceType =
  | "switch"
  | "firewall"
  | "server"
  | "gpu_server"
  | "nas"
  | "ups"
  | "home_assistant"
  | "blank";

export type UnitId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6" | "U7" | "U8" | "U9" | "U10";

export interface MetricSpec {
  label: string;
  unit: string;
  generate: () => number | string;
}

export interface SwitchConfig {
  type: "switch";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  portCount: 8 | 16 | 24 | 48;
  speed: "1G" | "10G" | "25G";
  sfpPorts: 0 | 2 | 4;
}

export interface FirewallConfig {
  type: "firewall";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  wanPorts: 1 | 2 | 4;
  lanPorts: 4 | 6 | 8 | 12;
  software: string;
}

export interface ServerConfig {
  type: "server";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  cpuCores: number;
  ramGB: number;
  driveCount: 2 | 4 | 6 | 8;
  services: string[];
}

export interface GPUServerConfig {
  type: "gpu_server";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  gpuModel: string;
  vramGB: number;
  driveCount: 2 | 4 | 6;
  services: string[];
}

export interface NASConfig {
  type: "nas";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  driveCount: 4 | 6 | 8 | 12 | 16;
  raidType: string;
  filesystem: string;
}

export interface UPSConfig {
  type: "ups";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  brand: string;
  capacityVA: number;
}

export interface HomeAssistantConfig {
  type: "home_assistant";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
  deviceCount: number;
}

export interface BlankConfig {
  type: "blank";
  label: string;
  accentHex: string;
  status: "online" | "alert" | "offline";
}

export type SlotConfig =
  | SwitchConfig
  | FirewallConfig
  | ServerConfig
  | GPUServerConfig
  | NASConfig
  | UPSConfig
  | HomeAssistantConfig
  | BlankConfig;

export type RackState = Record<UnitId, SlotConfig>;

export function getMetrics(config: SlotConfig): MetricSpec[] {
  switch (config.type) {
    case "switch":
      return [
        { label: "Ports Active", unit: "", generate: () => `${config.portCount}/${config.portCount}` },
        { label: "Throughput", unit: " Gbps", generate: () => (Math.random() * 2 + 7).toFixed(1) },
        { label: "Latency", unit: " ms", generate: () => (Math.random() * 0.5 + 0.1).toFixed(2) },
        { label: "Packets Drop", unit: "%", generate: () => "0.00" },
      ];
    case "firewall":
      return [
        { label: "Blocked", unit: "/min", generate: () => Math.floor(Math.random() * 50 + 10) },
        { label: "VPN Tunnels", unit: "", generate: () => Math.floor(Math.random() * 2 + 2) },
        { label: "CPU", unit: "%", generate: () => Math.floor(Math.random() * 15 + 5) },
        { label: "Règles", unit: "", generate: () => 1432 },
      ];
    case "server":
      return [
        { label: "CPU", unit: "%", generate: () => Math.floor(Math.random() * 40 + 20) },
        { label: "RAM", unit: "%", generate: () => Math.floor(Math.random() * 20 + 60) },
        { label: "Processus", unit: "", generate: () => Math.floor(Math.random() * 50 + 100) },
        { label: "Uptime", unit: "d", generate: () => 42 },
      ];
    case "gpu_server":
      return [
        { label: "GPU Load", unit: "%", generate: () => Math.floor(Math.random() * 50 + 30) },
        { label: "VRAM", unit: "GB", generate: () => (Math.random() * 2 + config.vramGB * 0.6).toFixed(1) },
        { label: "Temp", unit: "°C", generate: () => Math.floor(Math.random() * 10 + 65) },
        { label: "Tokens", unit: "/s", generate: () => Math.floor(Math.random() * 30 + 50) },
      ];
    case "nas": {
      const totalTB = config.driveCount * 4;
      return [
        { label: "Usage", unit: "TB", generate: () => `${(totalTB * 0.44).toFixed(1)} / ${totalTB}` },
        { label: "Lecture", unit: "MB/s", generate: () => Math.floor(Math.random() * 50 + 10) },
        { label: "Écriture", unit: "MB/s", generate: () => Math.floor(Math.random() * 80 + 5) },
        { label: "RAID", unit: "", generate: () => "Healthy" },
      ];
    }
    case "ups":
      return [
        { label: "Batterie", unit: "%", generate: () => "100" },
        { label: "Charge", unit: "%", generate: () => Math.floor(Math.random() * 5 + 35) },
        { label: "Autonomie", unit: "min", generate: () => Math.floor(Math.random() * 5 + 45) },
        { label: "Entrée", unit: "V", generate: () => Math.floor(Math.random() * 4 + 228) },
      ];
    case "home_assistant":
      return [
        { label: "Appareils", unit: "", generate: () => config.deviceCount },
        { label: "Automations", unit: "", generate: () => 124 },
        { label: "Évènements", unit: "/h", generate: () => Math.floor(Math.random() * 100 + 400) },
        { label: "Uptime", unit: "d", generate: () => 42 },
      ];
    case "blank":
      return [];
  }
}

export function getSlotHeight(config: SlotConfig): number {
  switch (config.type) {
    case "switch": return 52;
    case "firewall": return 52;
    case "server": return 90;
    case "gpu_server": return 90;
    case "nas": return config.driveCount <= 8 ? 110 : 130;
    case "ups": return 52;
    case "home_assistant": return 68;
    case "blank": return 44;
  }
}

export function getServices(config: SlotConfig): string[] {
  if (config.type === "server") return config.services;
  if (config.type === "gpu_server") return config.services;
  if (config.type === "firewall") return [config.software, "WireGuard", "Suricata"];
  if (config.type === "switch") return [`${config.portCount}p ${config.speed}`, "VLAN", "QoS"];
  if (config.type === "nas") return [config.filesystem, config.raidType, "SMB/NFS"];
  if (config.type === "ups") return [config.brand, `${config.capacityVA}VA`];
  if (config.type === "home_assistant") return ["HASS Core", "Mosquitto", "Zigbee2MQTT"];
  return [];
}

export function getTypeDescription(config: SlotConfig): string {
  switch (config.type) {
    case "switch":
      return `Switch réseau ${config.portCount} ports ${config.speed}.${config.sfpPorts > 0 ? ` ${config.sfpPorts} ports SFP+.` : ""} Gestion VLAN, QoS, LACP.`;
    case "firewall":
      return `Firewall ${config.software} — ${config.wanPorts} WAN, ${config.lanPorts} ports LAN. Règles de sécurité, VPN et filtrage réseau.`;
    case "server":
      return `Serveur ${config.cpuCores} cœurs CPU, ${config.ramGB} GB RAM, ${config.driveCount} baies disques.`;
    case "gpu_server":
      return `Serveur GPU ${config.gpuModel} — ${config.vramGB} GB VRAM, ${config.driveCount} baies disques.`;
    case "nas":
      return `Stockage ${config.driveCount} baies, ${config.raidType}, système de fichiers ${config.filesystem}.`;
    case "ups":
      return `Onduleur ${config.brand}, capacité ${config.capacityVA} VA. Protection secteur et arrêt propre des serveurs.`;
    case "home_assistant":
      return `Domotique Home Assistant — ${config.deviceCount} appareils connectés. Automatisations, capteurs et scénarios.`;
    case "blank":
      return "Emplacement libre dans la baie 19\".";
  }
}

export const DEFAULT_RACK: RackState = {
  U1: { type: "switch", label: "Switch 10 GbE", accentHex: "#22d3ee", status: "online", portCount: 24, speed: "10G", sfpPorts: 2 },
  U2: { type: "firewall", label: "Firewall / Routeur", accentHex: "#f97316", status: "online", wanPorts: 1, lanPorts: 8, software: "OPNsense" },
  U3: { type: "server", label: "Néron Core", accentHex: "#a855f7", status: "online", cpuCores: 16, ramGB: 64, driveCount: 4, services: ["Néron OS", "API Gateway", "Orchestrateur"] },
  U4: { type: "server", label: "Néron Memory", accentHex: "#3b82f6", status: "online", cpuCores: 8, ramGB: 32, driveCount: 6, services: ["Vector DB", "PostgreSQL", "Redis"] },
  U5: { type: "gpu_server", label: "Provider LLM #1", accentHex: "#22c55e", status: "online", gpuModel: "RTX 3090", vramGB: 24, driveCount: 4, services: ["Ollama", "vLLM", "Text-Gen-WebUI"] },
  U6: { type: "gpu_server", label: "Provider LLM #2 (GPU)", accentHex: "#34d399", status: "online", gpuModel: "RTX 4090", vramGB: 24, driveCount: 4, services: ["TensorRT", "Stable Diffusion", "Whisper"] },
  U7: { type: "home_assistant", label: "Home Assistant", accentHex: "#f59e0b", status: "online", deviceCount: 89 },
  U8: { type: "nas", label: "Stockage / NAS / Sauvegardes", accentHex: "#facc15", status: "online", driveCount: 8, raidType: "ZFS RAIDZ2", filesystem: "ZFS" },
  U9: { type: "server", label: "Watchdog + Doctor", accentHex: "#ef4444", status: "alert", cpuCores: 4, ramGB: 16, driveCount: 2, services: ["Prometheus", "Grafana", "Alertmanager"] },
  U10: { type: "ups", label: "UPS APC", accentHex: "#38bdf8", status: "online", brand: "APC Smart-UPS", capacityVA: 1500 },
};

const STORAGE_KEY = "neron-rack-v2";

export function loadRack(): RackState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return { ...DEFAULT_RACK, ...parsed };
    }
  } catch (e) {
    console.warn("[neron] Failed to load rack config from localStorage:", e);
  }
  return DEFAULT_RACK;
}

export function saveRack(rack: RackState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rack));
  } catch (e) {
    console.warn("[neron] Failed to save rack config to localStorage:", e);
  }
}

export const UNIT_IDS: UnitId[] = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10"];

export const ACCENT_PRESETS = [
  "#22d3ee", "#38bdf8", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#facc15",
  "#22c55e", "#34d399", "#e2e8f0",
];

export const DEVICE_LABELS: Record<DeviceType, string> = {
  switch: "Switch réseau",
  firewall: "Firewall / Routeur",
  server: "Serveur",
  gpu_server: "Serveur GPU",
  nas: "NAS / Stockage",
  ups: "Onduleur (UPS)",
  home_assistant: "Home Assistant",
  blank: "Panneau vide",
};
