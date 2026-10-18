import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Network, Shield, Server, Cpu, HardDrive, Zap, Home, Square } from "lucide-react";
import {
  RackState, SlotConfig, UnitId, DeviceType, SwitchConfig, NASConfig,
  loadRack, saveRack, UNIT_IDS, getSlotHeight, getServices, getTypeDescription, DEVICE_LABELS,
} from "../data/rackConfig";
import { useLiveMetrics } from "../hooks/use-metrics";
import { RackConfigModal } from "../components/RackConfigModal";

const TYPE_ICONS: Record<DeviceType, React.ElementType> = {
  switch: Network, firewall: Shield, server: Server, gpu_server: Cpu,
  nas: HardDrive, ups: Zap, home_assistant: Home, blank: Square,
};

export default function Dashboard() {
  const [rack, setRack] = React.useState<RackState>(() => loadRack());
  const [selectedUnit, setSelectedUnit] = React.useState<UnitId | null>(null);
  const [configUnit, setConfigUnit] = React.useState<UnitId | null>(null);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeConfig = selectedUnit ? rack[selectedUnit] : null;

  function handleSaveConfig(unitId: UnitId, config: SlotConfig) {
    const updated = { ...rack, [unitId]: config };
    setRack(updated);
    saveRack(updated);
    if (selectedUnit === unitId && config.type === "blank") {
      setSelectedUnit(null);
    }
  }

  function handleUnitClick(unitId: UnitId) {
    if (rack[unitId].type === "blank") return;
    setSelectedUnit((prev) => (prev === unitId ? null : unitId));
  }

  function handleConfigClick(e: React.MouseEvent, unitId: UnitId) {
    e.stopPropagation();
    setConfigUnit(unitId);
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-hidden flex flex-col font-sans relative">
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-1000 opacity-15"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${activeConfig ? activeConfig.accentHex : "#1e3a8a"} 0%, transparent 65%)`,
        }}
      />

      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/50 backdrop-blur-md z-10 relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="font-mono text-primary font-bold text-lg leading-none">N</span>
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-widest text-white/90">INFRASTRUCTURE NÉRON</h1>
            <p className="text-[10px] text-white/40 tracking-wider font-mono">BAIE 19" — HOMELAB COMMAND CENTER</p>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-xs tracking-wider">SYS.ONLINE</span>
          </div>
          <div className="text-white/50 border border-white/10 px-3 py-1 rounded bg-white/5 text-xs tabular-nums">
            {currentTime.toLocaleTimeString("fr-FR", { hour12: false })}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex relative overflow-hidden z-10">
        <div className={`flex-1 flex justify-center items-start py-8 overflow-y-auto transition-all duration-500 ${selectedUnit ? "pr-[420px]" : ""}`}>
          <div className="relative flex flex-col" style={{ width: 680 }}>
            {/* Top handle bar */}
            <div className="h-5 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] border-t-2 border-x-2 border-[#333] rounded-t-sm flex items-center justify-center gap-3">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-2 h-1.5 bg-[#111] rounded-full" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)" }} />
              ))}
            </div>

            {/* Rack body */}
            <div
              className="border-x-[14px] border-b-[14px] border-[#1e1e1e] bg-[#0d0d0d]"
              style={{ boxShadow: "inset 4px 0 8px rgba(0,0,0,0.5), inset -4px 0 8px rgba(0,0,0,0.5)" }}
            >
              {/* Rail strip top */}
              <div className="h-3 bg-[#181818] border-b border-black flex items-center px-1 gap-1">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-[#0a0a0a] rounded-full" />
                ))}
              </div>

              <div className="flex flex-col gap-[3px] py-1 px-1">
                {UNIT_IDS.map((unitId) => (
                  <RackUnitRow
                    key={unitId}
                    unitId={unitId}
                    config={rack[unitId]}
                    height={getSlotHeight(rack[unitId])}
                    isSelected={selectedUnit === unitId}
                    onClick={() => handleUnitClick(unitId)}
                    onConfig={(e) => handleConfigClick(e, unitId)}
                  />
                ))}
              </div>

              {/* Rail strip bottom */}
              <div className="h-3 bg-[#181818] border-t border-black flex items-center px-1 gap-1">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-[#0a0a0a] rounded-full" />
                ))}
              </div>
            </div>

            {/* Bottom feet */}
            <div className="h-4 bg-gradient-to-b from-[#1a1a1a] to-[#111] border-b-2 border-x-2 border-[#333] rounded-b-sm flex items-end justify-between px-6 pb-1">
              <div className="w-8 h-2 bg-[#0a0a0a] rounded" />
              <div className="w-8 h-2 bg-[#0a0a0a] rounded" />
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedUnit && rack[selectedUnit] && rack[selectedUnit].type !== "blank" && (
            <DetailPanel
              unitId={selectedUnit}
              config={rack[selectedUnit]}
              onClose={() => setSelectedUnit(null)}
              onConfig={() => setConfigUnit(selectedUnit)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-7 border-t border-white/5 bg-black/80 backdrop-blur-md flex items-center px-4 justify-between font-mono text-[10px] text-white/30 z-20 relative shrink-0">
        <div className="flex gap-4">
          <span>BAIE 19 — INFRASTRUCTURE NÉRON</span>
          <span>•</span>
          <span>{UNIT_IDS.length} UNITÉS</span>
        </div>
        <div className="flex gap-4">
          <span>{currentTime.toISOString().split("T")[0]}</span>
          <span>SECURE.LOCAL</span>
        </div>
      </footer>

      {/* Config modal */}
      <AnimatePresence>
        {configUnit && (
          <RackConfigModal
            unitId={configUnit}
            current={rack[configUnit]}
            onSave={(config) => handleSaveConfig(configUnit, config)}
            onClose={() => setConfigUnit(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Rack Unit Row                                                  */
/* ─────────────────────────────────────────────────────────────── */

function RackUnitRow({
  unitId,
  config,
  height,
  isSelected,
  onClick,
  onConfig,
}: {
  unitId: UnitId;
  config: SlotConfig;
  height: number;
  isSelected: boolean;
  onClick: () => void;
  onConfig: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      data-testid={`rack-unit-${unitId}`}
      whileHover={{ scale: 1.005 }}
      className="w-full flex items-stretch text-left relative group"
      style={{ height }}
    >
      {/* Selected glow overlay */}
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm z-10"
          style={{ boxShadow: `0 0 0 1px ${config.accentHex}60, 0 0 20px -4px ${config.accentHex}40` }}
        />
      )}

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-sm z-10"
        style={{ boxShadow: `0 0 0 1px ${config.accentHex}30` }}
      />

      {/* Left ear */}
      <button
        onClick={onClick}
        className="w-9 h-full flex flex-col items-center justify-between bg-[#1c1c1c] border-r border-black/70 py-2 shrink-0 focus:outline-none"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,1)" }} />
        <span className="font-mono text-[9px] text-white/25 font-bold tracking-wide" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {unitId}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,1)" }} />
      </button>

      {/* Faceplate */}
      <button onClick={onClick} className="flex-1 h-full overflow-hidden focus:outline-none text-left">
        <ServerFaceplate config={config} isSelected={isSelected} height={height} />
      </button>

      {/* Right ear — config button appears on hover */}
      <div className="w-9 h-full flex flex-col items-center justify-between bg-[#1c1c1c] border-l border-black/70 py-2 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,1)" }} />
        <button
          onClick={onConfig}
          title="Configurer"
          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 focus:outline-none"
          style={{ color: config.accentHex }}
        >
          <Settings className="w-3 h-3" />
        </button>
        <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,1)" }} />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Faceplate dispatcher — by config.type                         */
/* ─────────────────────────────────────────────────────────────── */

function ServerFaceplate({ config, isSelected, height }: { config: SlotConfig; isSelected: boolean; height: number }) {
  if (config.type === "switch") return <SwitchFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "firewall") return <FirewallFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "nas") return <NASFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "ups") return <UPSFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "home_assistant") return <HomeAssistantFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "blank") return <BlankFaceplate config={config} />;
  return <GenericServerFaceplate config={config} isSelected={isSelected} height={height} />;
}

/* ─────────────────────────────────────────────────────────────── */
/*  Switch faceplate                                               */
/* ─────────────────────────────────────────────────────────────── */

function SwitchFaceplate({ config, isSelected }: { config: SwitchConfig; isSelected: boolean }) {
  const [actives, setActives] = React.useState<boolean[]>(() =>
    Array.from({ length: config.portCount }, () => Math.random() > 0.3)
  );

  React.useEffect(() => {
    setActives(Array.from({ length: config.portCount }, () => Math.random() > 0.3));
  }, [config.portCount]);

  React.useEffect(() => {
    const t = setInterval(() => {
      setActives((prev) => prev.map((v) => (Math.random() > 0.85 ? !v : v)));
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-4 gap-1.5 relative"
      style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #141414 50%, #111 100%)",
        borderTop: "1px solid #2a2a2a",
        borderBottom: "1px solid #0a0a0a",
      }}
    >
      <div className="absolute left-4 top-0 bottom-0 flex items-center pr-3 border-r border-white/5" style={{ width: 110 }}>
        <div className="flex flex-col">
          <span className="font-mono text-[8px] text-white/20 uppercase tracking-widest leading-tight">{config.speed}</span>
          <span className="font-mono text-[11px] font-bold text-cyan-400/70 tracking-wider leading-tight">SWITCH</span>
          <span className="font-mono text-[7px] text-white/15 tracking-wider leading-tight">{config.portCount}-PORT</span>
        </div>
      </div>

      <div className="ml-[120px] flex flex-col gap-1">
        <div className="flex gap-[3px]">
          {actives.map((on, i) => (
            <div
              key={i}
              className="h-[4px] rounded-full transition-all duration-150"
              style={{
                width: Math.max(12, Math.floor(400 / config.portCount)),
                backgroundColor: on ? "#22d3ee" : "#0a1a1a",
                boxShadow: on ? "0 0 4px #22d3ee" : "none",
              }}
            />
          ))}
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: config.portCount }).map((_, i) => (
            <div
              key={i}
              className="h-[14px] rounded-sm flex items-center justify-center"
              style={{
                width: Math.max(12, Math.floor(400 / config.portCount)),
                background: "linear-gradient(180deg, #0f2020 0%, #071414 100%)",
                border: "1px solid #0a2a2a",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              <div className="w-[10px] h-[8px] rounded-sm" style={{ background: "#050e0e", border: "1px solid #071a1a" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-3 top-0 bottom-0 flex items-center gap-2">
        {config.sfpPorts > 0 && (
          <div className="flex flex-col gap-1">
            {Array.from({ length: Math.min(config.sfpPorts, 2) }).map((_, i) => (
              <div key={i} className="w-[24px] h-[10px] rounded-sm" style={{ background: "linear-gradient(90deg, #001a10, #000e09)", border: "1px solid #002a18" }}>
                <div className="w-[8px] h-full rounded-sm bg-[#001a10] ml-auto" />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5 items-center">
          <Blinker color="#22d3ee" interval={2000} />
          <Blinker color="#22c55e" interval={3000} on />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Firewall faceplate                                             */
/* ─────────────────────────────────────────────────────────────── */

function FirewallFaceplate({ config, isSelected }: { config: SlotConfig & { type: "firewall" }; isSelected: boolean }) {
  return (
    <div
      className="w-full h-full flex items-center px-4 gap-4 relative"
      style={{
        background: "linear-gradient(180deg, #1d1510 0%, #141008 100%)",
        borderTop: "1px solid #2a1f10",
        borderBottom: "1px solid #0a0806",
      }}
    >
      <div className="flex flex-col pr-4 border-r border-white/5 shrink-0" style={{ width: 100 }}>
        <span className="font-mono text-[9px] text-white/20 tracking-widest uppercase">FIREWALL</span>
        <span className="font-mono text-[11px] font-bold text-orange-400/80 tracking-wider">ROUTEUR</span>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-[4px] h-[4px] rounded-full bg-orange-500" style={{ boxShadow: "0 0 4px #f97316" }} />
        <div className="w-[20px] h-[16px] rounded-sm" style={{ background: "#1a0a00", border: "1px solid #3a1800" }}>
          <div className="w-[12px] h-[10px] rounded-sm bg-[#100800] mx-auto mt-[2px]" />
        </div>
        <span className="font-mono text-[7px] text-orange-400/50">WAN</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-[3px]">
          {Array.from({ length: config.lanPorts }).map((_, i) => (
            <RandomBlinker key={i} color="#22c55e" size={3} />
          ))}
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: config.lanPorts }).map((_, i) => (
            <div key={i} className="w-[20px] h-[16px] rounded-sm" style={{ background: "#0d1a0d", border: "1px solid #152015" }}>
              <div className="w-[12px] h-[10px] rounded-sm bg-[#080f08] mx-auto mt-[2px]" />
            </div>
          ))}
        </div>
        <span className="font-mono text-[7px] text-white/20">LAN 1–{config.lanPorts}</span>
      </div>

      <div className="ml-2 px-2 py-1 rounded-sm" style={{ background: "#0a1200", border: "1px solid #1a2800", minWidth: 80 }}>
        <div className="font-mono text-[8px] text-green-400/60 leading-tight">{config.software}</div>
        <div className="font-mono text-[9px] text-green-300/80">SECURE</div>
      </div>

      <div className="absolute right-4 top-0 bottom-0 flex items-center gap-2">
        <div className="flex flex-col gap-1.5">
          <Blinker color="#f97316" interval={5000} />
          <Blinker color="#22c55e" interval={3000} on />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Generic server faceplate (server + gpu_server)                */
/* ─────────────────────────────────────────────────────────────── */

function GenericServerFaceplate({ config, isSelected, height }: { config: SlotConfig; isSelected: boolean; height: number }) {
  const isGPU = config.type === "gpu_server";
  const driveCount = (config as any).driveCount ?? 4;

  return (
    <div
      className="w-full h-full flex items-stretch relative"
      style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #131313 40%, #0f0f0f 100%)",
        borderTop: "1px solid #272727",
        borderBottom: "1px solid #090909",
      }}
    >
      <div
        className="flex flex-col justify-between items-center px-2 py-2.5 shrink-0"
        style={{ width: 52, borderRight: "1px solid #0a0a0a", background: "linear-gradient(180deg, #1e1e1e, #161616)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, #2a2a2a, #111)", border: "2px solid #333", boxShadow: "0 2px 4px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)" }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: "#1a1a1a", border: "1.5px solid #444" }}>
            <div className="w-full h-full rounded-full" style={{ background: `${config.accentHex}20` }} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-center">
          <Blinker color="#22c55e" size={4} on interval={4000} />
          <RandomBlinker color={config.accentHex} size={4} />
          <Blinker color={isGPU ? config.accentHex : "#3b82f6"} size={4} interval={2500} />
        </div>
        <div className="w-5 h-3 rounded-sm" style={{ background: "#0a0a0a", border: "1px solid #222", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)" }} />
      </div>

      <div className="flex-1 flex flex-col justify-center px-3 py-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: `${config.accentHex}bb` }}>
            {config.label.toUpperCase()}
          </span>
          {isGPU && (
            <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: `${config.accentHex}20`, color: config.accentHex, border: `1px solid ${config.accentHex}40` }}>
              GPU
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: driveCount }).map((_, i) => (
            <DriveBay key={i} accentHex={config.accentHex} index={i} />
          ))}
          {Array.from({ length: Math.max(0, 6 - driveCount) }).map((_, i) => (
            <div key={`blank-${i}`} className="flex-1" style={{ height: 36, background: "linear-gradient(180deg, #111, #0a0a0a)", border: "1px solid #1a1a1a", borderRadius: 2 }} />
          ))}
        </div>
        {isGPU && <GPUBar accentHex={config.accentHex} />}
      </div>

      <div className="flex flex-col justify-around items-center px-2 py-2 shrink-0" style={{ width: 36, borderLeft: "1px solid #0a0a0a", background: "#0f0f0f" }}>
        <FanGrille size={24} />
        <FanGrille size={24} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Home Assistant faceplate                                       */
/* ─────────────────────────────────────────────────────────────── */

function HomeAssistantFaceplate({ config, isSelected }: { config: SlotConfig & { type: "home_assistant" }; isSelected: boolean }) {
  return (
    <div
      className="w-full h-full flex items-center px-4 gap-4 relative"
      style={{
        background: "linear-gradient(180deg, #1a1508 0%, #110f05 100%)",
        borderTop: "1px solid #252010",
        borderBottom: "1px solid #080600",
      }}
    >
      <div className="flex flex-col pr-4 border-r border-white/5 shrink-0" style={{ width: 120 }}>
        <span className="font-mono text-[8px] text-white/20 tracking-widest uppercase">Home</span>
        <span className="font-mono text-[12px] font-bold tracking-wider" style={{ color: `${config.accentHex}cc` }}>ASSISTANT</span>
        <span className="font-mono text-[7px] text-white/20 tracking-wide">DOMOTIQUE</span>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <Blinker color="#f59e0b" size={5} on interval={3000} />
          <span className="font-mono text-[7px] text-white/20">PWR</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <RandomBlinker color="#22c55e" size={5} />
          <span className="font-mono text-[7px] text-white/20">ACT</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <RandomBlinker color={config.accentHex} size={5} />
          <span className="font-mono text-[7px] text-white/20">ZBE</span>
        </div>
      </div>

      <div className="ml-auto flex flex-col items-end gap-1 pr-2">
        <span className="font-mono text-[10px] font-bold" style={{ color: `${config.accentHex}cc` }}>{config.deviceCount}</span>
        <span className="font-mono text-[7px] text-white/25">APPAREILS</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NAS faceplate                                                  */
/* ─────────────────────────────────────────────────────────────── */

function NASFaceplate({ config, isSelected }: { config: NASConfig; isSelected: boolean }) {
  return (
    <div
      className="w-full h-full flex items-stretch relative"
      style={{
        background: "linear-gradient(180deg, #1a1700 0%, #111000 100%)",
        borderTop: "1px solid #2a2500",
        borderBottom: "1px solid #080700",
      }}
    >
      <div className="flex flex-col justify-between items-center px-2 py-2.5 shrink-0" style={{ width: 52, borderRight: "1px solid #0a0a0a", background: "linear-gradient(180deg, #1e1a00, #161200)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, #2a2500, #111000)", border: "2px solid #333200" }}>
          <div className="w-3 h-3 rounded-full" style={{ background: "#1a1500", border: "1.5px solid #443e00" }}>
            <div className="w-full h-full rounded-full" style={{ background: `${config.accentHex}20` }} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-center">
          <Blinker color="#22c55e" size={4} on interval={4000} />
          <RandomBlinker color={config.accentHex} size={4} />
          <Blinker color="#3b82f6" size={4} interval={1500} />
        </div>
        <div className="w-5 h-3 rounded-sm" style={{ background: "#0a0900", border: "1px solid #222100" }} />
      </div>

      <div className="flex-1 flex flex-col justify-center px-3 py-2 gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: `${config.accentHex}bb` }}>
            {config.label.toUpperCase()}
          </span>
          <span className="font-mono text-[7px] px-1 py-0.5 rounded" style={{ background: `${config.accentHex}15`, color: `${config.accentHex}99`, border: `1px solid ${config.accentHex}30` }}>
            {config.raidType}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(config.driveCount, 8) }).map((_, i) => (
            <NASBay key={i} accentHex={config.accentHex} index={i} />
          ))}
          {config.driveCount > 8 && (
            <div className="flex items-center justify-center px-1">
              <span className="font-mono text-[8px] text-white/30">+{config.driveCount - 8}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-around items-center px-2 py-2 shrink-0" style={{ width: 36, borderLeft: "1px solid #0a0a0a", background: "#0f0e00" }}>
        <FanGrille size={24} />
        <FanGrille size={24} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  UPS faceplate                                                  */
/* ─────────────────────────────────────────────────────────────── */

function UPSFaceplate({ config, isSelected }: { config: SlotConfig & { type: "ups" }; isSelected: boolean }) {
  return (
    <div
      className="w-full h-full flex items-center px-4 gap-4 relative"
      style={{
        background: "linear-gradient(180deg, #080d18 0%, #050810 100%)",
        borderTop: "1px solid #101828",
        borderBottom: "1px solid #030508",
      }}
    >
      <div className="flex flex-col pr-4 border-r border-white/5 shrink-0" style={{ width: 80 }}>
        <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">UPS</span>
        <span className="font-mono text-[10px] font-bold text-sky-400/80 tracking-wider">ONDULEUR</span>
      </div>

      <div className="flex-1 h-[18px] rounded-sm overflow-hidden" style={{ background: "#050d1a", border: "1px solid #0a1830" }}>
        <div className="h-full rounded-sm transition-all" style={{ width: "100%", background: "linear-gradient(90deg, #22c55e, #16a34a)", boxShadow: "0 0 8px #22c55e40" }} />
      </div>
      <span className="font-mono text-[9px] text-sky-300/60 shrink-0">BAT 100%</span>

      <div className="px-2 py-1 rounded-sm shrink-0" style={{ background: "#070e1e", border: "1px solid #0d1e3c", minWidth: 70 }}>
        <div className="font-mono text-[8px] text-sky-400/60">{config.capacityVA}VA</div>
        <div className="font-mono text-[9px] text-sky-300/80">ONLINE</div>
      </div>

      <div className="absolute right-4 top-0 bottom-0 flex items-center gap-2">
        <div className="flex flex-col gap-1.5">
          <Blinker color="#38bdf8" interval={4000} on />
          <Blinker color="#22c55e" interval={3000} on />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Blank faceplate                                                */
/* ─────────────────────────────────────────────────────────────── */

function BlankFaceplate({ config }: { config: SlotConfig }) {
  return (
    <div
      className="w-full h-full flex items-center px-4"
      style={{
        background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
        borderTop: "1px solid #1a1a1a",
        borderBottom: "1px solid #070707",
      }}
    >
      <div className="flex-1 h-[2px]" style={{ background: "repeating-linear-gradient(90deg, #1a1a1a 0px, #1a1a1a 6px, transparent 6px, transparent 12px)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Detail Panel                                                   */
/* ─────────────────────────────────────────────────────────────── */

function DetailPanel({
  unitId,
  config,
  onClose,
  onConfig,
}: {
  unitId: UnitId;
  config: SlotConfig;
  onClose: () => void;
  onConfig: () => void;
}) {
  const { metrics, specs } = useLiveMetrics(config);
  const Icon = TYPE_ICONS[config.type];
  const services = getServices(config);
  const description = getTypeDescription(config);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="absolute top-0 right-0 bottom-0 w-[420px] bg-[#0b0b0b]/96 backdrop-blur-xl border-l border-white/8 shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.9)] z-30 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: `linear-gradient(135deg, ${config.accentHex}, transparent 60%)` }} />
        <div className="flex gap-2 absolute top-4 right-4">
          <button onClick={onConfig} className="text-white/30 hover:text-white/80 transition-colors" title="Configurer">
            <Settings className="w-4 h-4" />
          </button>
          <button data-testid="button-close-panel" onClick={onClose} className="text-white/30 hover:text-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${config.accentHex}15`, border: `1px solid ${config.accentHex}30` }}>
            <Icon className="w-6 h-6" style={{ color: config.accentHex }} />
          </div>
          <div className="mt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/50 font-bold border border-white/5">{unitId}</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border" style={{
                background: config.status === "online" ? "#22c55e15" : config.status === "alert" ? "#ef444415" : "#55555515",
                color: config.status === "online" ? "#22c55e" : config.status === "alert" ? "#ef4444" : "#888",
                borderColor: config.status === "online" ? "#22c55e40" : config.status === "alert" ? "#ef444440" : "#55555540",
              }}>
                {config.status === "alert" ? "⚠ ALERTE" : config.status.toUpperCase()}
              </span>
            </div>
            <h2 className="font-sans font-bold text-lg text-white/90 leading-tight">{config.label}</h2>
            <p className="font-mono text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">{DEVICE_LABELS[config.type]}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-7">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Description</h3>
          <p className="text-sm text-white/65 leading-relaxed">{description}</p>
        </div>

        {/* Live Metrics */}
        {specs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Télémétrie live</h3>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {specs.map((spec, i) => (
                <div
                  key={i}
                  data-testid={`metric-${unitId}-${i}`}
                  className="border rounded p-3 flex flex-col justify-between"
                  style={{ background: "#0f0f0f", borderColor: "#1a1a1a", height: 76 }}
                >
                  <span className="font-mono text-[9px] text-white/35">{spec.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xl font-bold text-white/85 tracking-tight tabular-nums">
                      {metrics[i] !== undefined ? metrics[i] : "---"}
                    </span>
                    <span className="font-mono text-[9px] text-white/30">{spec.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Services actifs</h3>
            <div className="flex flex-wrap gap-2">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="text-xs font-mono px-2.5 py-1 rounded-full text-white/60 flex items-center gap-1.5"
                  style={{ background: "#111", border: "1px solid #222" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.accentHex, boxShadow: `0 0 4px ${config.accentHex}` }} />
                  {service}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20 text-center font-mono text-[9px] text-white/20">
        NÉRON OS // SYSTÈME DE SUPERVISION
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared sub-components                                          */
/* ─────────────────────────────────────────────────────────────── */

function DriveBay({ accentHex, index }: { accentHex: string; index: number }) {
  const [active] = React.useState(() => Math.random() > 0.15);
  return (
    <div
      className="flex-1 flex flex-col items-center gap-1 py-1"
      style={{ height: 36, background: "linear-gradient(180deg, #1a1a1a, #111)", border: "1px solid #242424", borderRadius: 2 }}
    >
      <div className="w-full h-[3px] rounded-full" style={{ background: active ? accentHex : "#1a1a1a", boxShadow: active ? `0 0 4px ${accentHex}` : "none", opacity: 0.7 }} />
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-2 h-2 rounded-full" style={{ background: active ? "#22c55e20" : "#111", border: `1px solid ${active ? "#22c55e40" : "#1a1a1a"}` }} />
      </div>
    </div>
  );
}

function NASBay({ accentHex, index }: { accentHex: string; index: number }) {
  const [active] = React.useState(() => Math.random() > 0.1);
  return (
    <div
      className="flex flex-col items-center py-1 gap-1"
      style={{ width: 30, background: "linear-gradient(180deg, #1a1700, #0e0c00)", border: "1px solid #2a2500", borderRadius: 2 }}
    >
      <div className="w-[20px] h-[3px] rounded-full" style={{ background: active ? accentHex : "#1a1800", boxShadow: active ? `0 0 4px ${accentHex}` : "none", opacity: 0.7 }} />
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-2 h-2 rounded-full" style={{ background: active ? "#22c55e20" : "#110e00", border: `1px solid ${active ? "#22c55e40" : "#1a1800"}` }} />
      </div>
    </div>
  );
}

function GPUBar({ accentHex }: { accentHex: string }) {
  const [width, setWidth] = React.useState(70);
  React.useEffect(() => {
    const t = setInterval(() => setWidth(40 + Math.random() * 55), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[8px] text-white/25 shrink-0">GPU</span>
      <div className="flex-1 h-[3px] rounded-full bg-[#1a1a1a] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${width}%`, background: accentHex, boxShadow: `0 0 4px ${accentHex}` }} />
      </div>
      <span className="font-mono text-[8px] text-white/25 shrink-0 tabular-nums w-7">{Math.round(width)}%</span>
    </div>
  );
}

function FanGrille({ size }: { size: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: size, height: size,
        background: "radial-gradient(circle, #0a0a0a, #050505)",
        border: "1px solid #1a1a1a",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.9)",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 1,
            height: size * 0.5,
            background: "#1a1a1a",
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: "center",
          }}
        />
      ))}
      <div className="w-2 h-2 rounded-full bg-[#080808] z-10" style={{ border: "1px solid #1a1a1a" }} />
    </div>
  );
}

function Blinker({ color, size = 5, on: forcedOn, interval = 2000 }: { color: string; size?: number; on?: boolean; interval?: number }) {
  const [lit, setLit] = React.useState(forcedOn ?? false);
  React.useEffect(() => {
    if (forcedOn !== undefined) return;
    const t = setInterval(() => setLit((v) => !v), interval);
    return () => clearInterval(t);
  }, [forcedOn, interval]);
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        backgroundColor: lit ? color : "#111",
        boxShadow: lit ? `0 0 5px ${color}` : "none",
        transition: "all 0.2s",
      }}
    />
  );
}

function RandomBlinker({ color, size = 5 }: { color: string; size?: number }) {
  const [lit, setLit] = React.useState(false);
  React.useEffect(() => {
    const tick = () => {
      if (Math.random() > 0.5) setLit((v) => !v);
      setTimeout(tick, 200 + Math.random() * 600);
    };
    const id = setTimeout(tick, Math.random() * 500);
    return () => clearTimeout(id);
  }, []);
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        backgroundColor: lit ? color : "#111",
        boxShadow: lit ? `0 0 5px ${color}` : "none",
        transition: "all 0.1s",
      }}
    />
  );
}
