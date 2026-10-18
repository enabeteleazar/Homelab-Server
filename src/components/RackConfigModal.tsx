import React from "react";
import { motion } from "framer-motion";
import {
  Network, Shield, Server, Cpu, HardDrive, Zap, Home, Square, X, Check,
} from "lucide-react";
import {
  SlotConfig, DeviceType, SwitchConfig, FirewallConfig, ServerConfig,
  GPUServerConfig, NASConfig, UPSConfig, HomeAssistantConfig,
  DEVICE_LABELS, ACCENT_PRESETS,
} from "../data/rackConfig";

const TYPE_ICONS: Record<DeviceType, React.ElementType> = {
  switch: Network,
  firewall: Shield,
  server: Server,
  gpu_server: Cpu,
  nas: HardDrive,
  ups: Zap,
  home_assistant: Home,
  blank: Square,
};

const TYPE_ACCENT: Record<DeviceType, string> = {
  switch: "#22d3ee",
  firewall: "#f97316",
  server: "#a855f7",
  gpu_server: "#34d399",
  nas: "#facc15",
  ups: "#38bdf8",
  home_assistant: "#f59e0b",
  blank: "#444",
};

const ALL_TYPES: DeviceType[] = [
  "switch", "firewall", "server", "gpu_server", "nas", "ups", "home_assistant", "blank",
];

interface Props {
  unitId: string;
  current: SlotConfig;
  onSave: (config: SlotConfig) => void;
  onClose: () => void;
}

export function RackConfigModal({ unitId, current, onSave, onClose }: Props) {
  const [selectedType, setSelectedType] = React.useState<DeviceType>(current.type);
  const [form, setForm] = React.useState<SlotConfig>(current);

  const set = (patch: Partial<SlotConfig>) =>
    setForm((prev) => ({ ...prev, ...patch } as SlotConfig));

  React.useEffect(() => {
    if (selectedType !== form.type) {
      const defaults = buildDefault(selectedType, form.label, form.accentHex);
      setForm(defaults);
    }
  }, [selectedType]);

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg flex flex-col"
        style={{ background: "#0e0e0e", border: "1px solid #222" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          <div>
            <h2 className="font-mono text-base font-bold text-white/90 tracking-wider">
              CONFIGURER {unitId}
            </h2>
            <p className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">
              BAIE 19 — INFRASTRUCTURE NÉRON
            </p>
          </div>
          <button
            data-testid="button-close-modal"
            onClick={onClose}
            className="text-white/30 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-3">
            <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
              Type d'appareil
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                const accent = TYPE_ACCENT[t];
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    data-testid={`type-select-${t}`}
                    onClick={() => setSelectedType(t)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded transition-all"
                    style={{
                      background: active ? `${accent}18` : "#151515",
                      border: `1px solid ${active ? accent + "60" : "#222"}`,
                      boxShadow: active ? `0 0 12px -3px ${accent}40` : "none",
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: active ? accent : "#555" }} />
                    <span
                      className="font-mono text-[8px] text-center leading-tight"
                      style={{ color: active ? "#ccc" : "#444" }}
                    >
                      {DEVICE_LABELS[t].replace(" / ", "/").toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedType !== "blank" && (
            <FormField label="Nom / label">
              <TextInput
                value={(form as any).label ?? ""}
                onChange={(v) => set({ label: v } as any)}
                placeholder="Nom de l'appareil"
              />
            </FormField>
          )}

          {selectedType === "switch" && <SwitchFields form={form as SwitchConfig} set={set} />}
          {selectedType === "firewall" && <FirewallFields form={form as FirewallConfig} set={set} />}
          {selectedType === "server" && <ServerFields form={form as ServerConfig} set={set} />}
          {selectedType === "gpu_server" && <GPUServerFields form={form as GPUServerConfig} set={set} />}
          {selectedType === "nas" && <NASFields form={form as NASConfig} set={set} />}
          {selectedType === "ups" && <UPSFields form={form as UPSConfig} set={set} />}
          {selectedType === "home_assistant" && <HomeAssistantFields form={form as HomeAssistantConfig} set={set} />}

          {selectedType !== "blank" && (
            <FormField label="Statut">
              <div className="flex gap-2">
                {(["online", "alert", "offline"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => set({ status: s } as any)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
                    style={{
                      background: form.status === s ? statusBg(s) : "#1a1a1a",
                      border: `1px solid ${form.status === s ? statusColor(s) + "80" : "#333"}`,
                      color: form.status === s ? statusColor(s) : "#555",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(s) }} />
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          <FormField label="Couleur accent">
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  data-testid={`color-${hex}`}
                  onClick={() => set({ accentHex: hex } as any)}
                  className="w-7 h-7 rounded-full transition-all relative"
                  style={{
                    background: hex,
                    boxShadow: form.accentHex === hex ? `0 0 0 2px #111, 0 0 0 3.5px ${hex}` : "none",
                  }}
                >
                  {form.accentHex === hex && (
                    <Check className="w-3 h-3 text-black absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </FormField>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid #1a1a1a" }}
        >
          <button
            data-testid="button-cancel-modal"
            onClick={onClose}
            className="font-mono text-xs px-4 py-2 rounded transition-colors text-white/40 hover:text-white/70"
            style={{ border: "1px solid #2a2a2a", background: "#111" }}
          >
            ANNULER
          </button>
          <button
            data-testid="button-save-modal"
            onClick={handleSave}
            className="font-mono text-xs px-5 py-2 rounded transition-all text-black font-bold"
            style={{
              background: form.accentHex,
              boxShadow: `0 0 12px -2px ${form.accentHex}80`,
            }}
          >
            APPLIQUER
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SwitchFields({ form, set }: { form: SwitchConfig; set: (p: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre de ports">
          <SelectInput
            value={String(form.portCount)}
            onChange={(v) => set({ portCount: Number(v) as any })}
            options={[
              { value: "8", label: "8 ports" },
              { value: "16", label: "16 ports" },
              { value: "24", label: "24 ports" },
              { value: "48", label: "48 ports" },
            ]}
          />
        </FormField>
        <FormField label="Vitesse">
          <SelectInput
            value={form.speed}
            onChange={(v) => set({ speed: v as any })}
            options={[
              { value: "1G", label: "1 GbE" },
              { value: "10G", label: "10 GbE" },
              { value: "25G", label: "25 GbE" },
            ]}
          />
        </FormField>
      </div>
      <FormField label="Ports SFP+">
        <SelectInput
          value={String(form.sfpPorts)}
          onChange={(v) => set({ sfpPorts: Number(v) as any })}
          options={[
            { value: "0", label: "Aucun" },
            { value: "2", label: "2 × SFP+" },
            { value: "4", label: "4 × SFP+" },
          ]}
        />
      </FormField>
    </>
  );
}

function FirewallFields({ form, set }: { form: FirewallConfig; set: (p: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ports WAN">
          <SelectInput
            value={String(form.wanPorts)}
            onChange={(v) => set({ wanPorts: Number(v) as any })}
            options={[
              { value: "1", label: "1 WAN" },
              { value: "2", label: "2 WAN" },
              { value: "4", label: "4 WAN" },
            ]}
          />
        </FormField>
        <FormField label="Ports LAN">
          <SelectInput
            value={String(form.lanPorts)}
            onChange={(v) => set({ lanPorts: Number(v) as any })}
            options={[
              { value: "4", label: "4 LAN" },
              { value: "6", label: "6 LAN" },
              { value: "8", label: "8 LAN" },
              { value: "12", label: "12 LAN" },
            ]}
          />
        </FormField>
      </div>
      <FormField label="Logiciel / OS">
        <TextInput
          value={form.software}
          onChange={(v) => set({ software: v })}
          placeholder="OPNsense, pfSense, VyOS…"
        />
      </FormField>
    </>
  );
}

function ServerFields({ form, set }: { form: ServerConfig; set: (p: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cœurs CPU">
          <SelectInput
            value={String(form.cpuCores)}
            onChange={(v) => set({ cpuCores: Number(v) })}
            options={[4, 8, 12, 16, 24, 32, 64, 128].map((n) => ({ value: String(n), label: `${n} cœurs` }))}
          />
        </FormField>
        <FormField label="RAM">
          <SelectInput
            value={String(form.ramGB)}
            onChange={(v) => set({ ramGB: Number(v) })}
            options={[8, 16, 32, 64, 128, 256, 512].map((n) => ({ value: String(n), label: `${n} GB` }))}
          />
        </FormField>
      </div>
      <FormField label="Baies de disques">
        <SelectInput
          value={String(form.driveCount)}
          onChange={(v) => set({ driveCount: Number(v) as any })}
          options={[
            { value: "2", label: "2 baies" },
            { value: "4", label: "4 baies" },
            { value: "6", label: "6 baies" },
            { value: "8", label: "8 baies" },
          ]}
        />
      </FormField>
      <FormField label="Services (séparés par virgule)">
        <TextInput
          value={form.services.join(", ")}
          onChange={(v) => set({ services: v.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="Nginx, Docker, PostgreSQL…"
        />
      </FormField>
    </>
  );
}

function GPUServerFields({ form, set }: { form: GPUServerConfig; set: (p: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Modèle GPU">
          <TextInput
            value={form.gpuModel}
            onChange={(v) => set({ gpuModel: v })}
            placeholder="RTX 4090, A100, H100…"
          />
        </FormField>
        <FormField label="VRAM">
          <SelectInput
            value={String(form.vramGB)}
            onChange={(v) => set({ vramGB: Number(v) })}
            options={[8, 12, 16, 24, 40, 48, 80].map((n) => ({ value: String(n), label: `${n} GB` }))}
          />
        </FormField>
      </div>
      <FormField label="Baies de disques">
        <SelectInput
          value={String(form.driveCount)}
          onChange={(v) => set({ driveCount: Number(v) as any })}
          options={[
            { value: "2", label: "2 baies" },
            { value: "4", label: "4 baies" },
            { value: "6", label: "6 baies" },
          ]}
        />
      </FormField>
      <FormField label="Services (séparés par virgule)">
        <TextInput
          value={form.services.join(", ")}
          onChange={(v) => set({ services: v.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="Ollama, vLLM, TensorRT…"
        />
      </FormField>
    </>
  );
}

function NASFields({ form, set }: { form: NASConfig; set: (p: any) => void }) {
  return (
    <>
      <FormField label="Nombre de baies">
        <SelectInput
          value={String(form.driveCount)}
          onChange={(v) => set({ driveCount: Number(v) as any })}
          options={[
            { value: "4", label: "4 baies" },
            { value: "6", label: "6 baies" },
            { value: "8", label: "8 baies" },
            { value: "12", label: "12 baies" },
            { value: "16", label: "16 baies" },
          ]}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type RAID">
          <SelectInput
            value={form.raidType}
            onChange={(v) => set({ raidType: v })}
            options={["RAID5", "RAID6", "RAID10", "ZFS RAIDZ", "ZFS RAIDZ2", "JBOD"].map((r) => ({ value: r, label: r }))}
          />
        </FormField>
        <FormField label="Système de fichiers">
          <SelectInput
            value={form.filesystem}
            onChange={(v) => set({ filesystem: v })}
            options={["ZFS", "ext4", "btrfs", "XFS"].map((f) => ({ value: f, label: f }))}
          />
        </FormField>
      </div>
    </>
  );
}

function UPSFields({ form, set }: { form: UPSConfig; set: (p: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Marque / Modèle">
        <TextInput
          value={form.brand}
          onChange={(v) => set({ brand: v })}
          placeholder="APC Smart-UPS 1500…"
        />
      </FormField>
      <FormField label="Capacité (VA)">
        <SelectInput
          value={String(form.capacityVA)}
          onChange={(v) => set({ capacityVA: Number(v) })}
          options={[500, 750, 1000, 1500, 2000, 3000, 5000].map((n) => ({ value: String(n), label: `${n} VA` }))}
        />
      </FormField>
    </div>
  );
}

function HomeAssistantFields({ form, set }: { form: HomeAssistantConfig; set: (p: any) => void }) {
  return (
    <FormField label="Nombre d'appareils">
      <SelectInput
        value={String(form.deviceCount)}
        onChange={(v) => set({ deviceCount: Number(v) })}
        options={[10, 25, 50, 75, 100, 150, 200, 300].map((n) => ({ value: String(n), label: `${n} appareils` }))}
      />
    </FormField>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[9px] text-white/35 uppercase tracking-widest block">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full font-mono text-xs px-3 py-2 rounded outline-none transition-colors"
      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#ccc" }}
      onFocus={(e) => (e.target.style.borderColor = "#444")}
      onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
    />
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full font-mono text-xs px-3 py-2 rounded outline-none cursor-pointer"
      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#ccc", appearance: "none" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#111" }}>{o.label}</option>
      ))}
    </select>
  );
}

function statusColor(s: "online" | "alert" | "offline"): string {
  return s === "online" ? "#22c55e" : s === "alert" ? "#ef4444" : "#555";
}

function statusBg(s: "online" | "alert" | "offline"): string {
  return s === "online" ? "#22c55e18" : s === "alert" ? "#ef444418" : "#33333318";
}

function buildDefault(type: DeviceType, label: string, accentHex: string): SlotConfig {
  const base = { label, accentHex, status: "online" as const };
  switch (type) {
    case "switch": return { ...base, type: "switch", portCount: 24, speed: "10G", sfpPorts: 2 };
    case "firewall": return { ...base, type: "firewall", wanPorts: 1, lanPorts: 8, software: "OPNsense" };
    case "server": return { ...base, type: "server", cpuCores: 8, ramGB: 32, driveCount: 4, services: [] };
    case "gpu_server": return { ...base, type: "gpu_server", gpuModel: "RTX 4090", vramGB: 24, driveCount: 4, services: [] };
    case "nas": return { ...base, type: "nas", driveCount: 8, raidType: "ZFS RAIDZ2", filesystem: "ZFS" };
    case "ups": return { ...base, type: "ups", brand: "APC Smart-UPS", capacityVA: 1500 };
    case "home_assistant": return { ...base, type: "home_assistant", deviceCount: 50 };
    case "blank": return { ...base, type: "blank" };
  }
}
