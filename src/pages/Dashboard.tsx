import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Network, Shield, Server, Cpu, HardDrive, Zap, Home, Square } from "lucide-react";
import {
  RackState, SlotConfig, UnitId, DeviceType, SwitchConfig, NASConfig,
  loadRack, saveRack, UNIT_IDS, getSlotHeight, getServices, getTypeDescription, DEVICE_LABELS,
} from "../data/rackConfig";
import { useLiveMetrics } from "../hooks/use-metrics";
import { RackConfigModal } from "../components/RackConfigModal";
import { useTower } from "../hooks/use-tower";
import { LiveUnit, Level, liveUnit, sourceOf, LEVEL_COLOR, LEVEL_LABEL, LIVE_SOURCE_LABEL } from "../data/live";

/** Largeur réelle de la baie dessinée ; elle est ensuite mise à l'échelle de l'écran. */
const RACK_W = 720;

function useMediaQuery(query: string) {
  const [match, setMatch] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Échelle de la baie : tient dans la largeur disponible, sans jamais l'agrandir au-delà de 1. */
function useRackFit(container: React.RefObject<HTMLDivElement | null>, rack: React.RefObject<HTMLDivElement | null>, panelOpen: boolean) {
  const [state, setState] = React.useState({ scale: 1, rackH: 0 });
  React.useLayoutEffect(() => {
    const c = container.current, r = rack.current;
    if (!c || !r) return;
    const measure = () => {
      const cs = getComputedStyle(c);
      // Panneau ouvert sur desktop : on réserve sa largeur tout de suite (la transition de padding est en cours)
      const padding = parseFloat(cs.paddingLeft) + (panelOpen ? 440 : parseFloat(cs.paddingRight));
      const avail = c.clientWidth - padding;
      setState({ scale: Math.min(1, Math.max(0.3, avail / RACK_W)), rackH: r.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    ro.observe(r);
    return () => ro.disconnect();
  }, [container, rack, panelOpen]);
  return state;
}

/** Texture « tôle perforée » des façades. */
const PERFORATED = { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.85) 1.1px, transparent 1.4px)", backgroundSize: "6px 6px" };
/** Reflet de tôle brossée. */
const BRUSHED = "repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)";

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
  const { tower, connected } = useTower();
  const live = React.useMemo(() => {
    const out = {} as Record<UnitId, LiveUnit | null>;
    UNIT_IDS.forEach((u) => { out[u] = liveUnit(sourceOf(u, rack[u]), tower); });
    return out;
  }, [rack, tower]);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const fitRef = React.useRef<HTMLDivElement>(null);
  const rackRef = React.useRef<HTMLDivElement>(null);
  const { scale, rackH } = useRackFit(fitRef, rackRef, selectedUnit !== null && isDesktop);
  const globalLevel: Level = !connected ? "off" : tower?.health?.level ?? "off";

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
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden flex flex-col font-sans relative">
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-1000 opacity-15"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${activeConfig ? activeConfig.accentHex : "#1e3a8a"} 0%, transparent 65%)`,
        }}
      />

      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center px-3 sm:px-6 gap-3 justify-between bg-black/50 backdrop-blur-md z-10 relative shrink-0 pt-[env(safe-area-inset-top)] box-content">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="font-mono text-primary font-bold text-lg leading-none">N</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-mono text-sm sm:text-lg font-bold tracking-wider sm:tracking-widest text-white/90 truncate">INFRASTRUCTURE NÉRON</h1>
            <p className="hidden sm:block text-[10px] text-white/40 tracking-wider font-mono">BAIE 19" — HOMELAB COMMAND CENTER</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 font-mono text-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: LEVEL_COLOR[globalLevel] }}></span>}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: connected ? LEVEL_COLOR[globalLevel] : "#64748b" }}></span>
            </span>
            <span className="text-xs tracking-wider" style={{ color: connected ? LEVEL_COLOR[globalLevel] : "#94a3b8" }} title={tower?.health?.issues.join("\n")}>
              {connected ? (
                <>
                  LIVE<span className="hidden md:inline"> · {LEVEL_LABEL[globalLevel]}</span>
                  {!!tower?.health?.problems && <span className="hidden lg:inline"> · {tower.health.problems} PROBLÈME(S)</span>}
                  {!!tower?.health?.problems && <span className="lg:hidden"> · {tower.health.problems}⚠</span>}
                </>
              ) : (
                <>HORS LIGNE<span className="hidden md:inline"> · SIMULATION</span></>
              )}
            </span>
          </div>
          <div className="hidden sm:block text-white/50 border border-white/10 px-3 py-1 rounded bg-white/5 text-xs tabular-nums">
            {currentTime.toLocaleTimeString("fr-FR", { hour12: false })}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex relative overflow-hidden z-10">
        <div
          ref={fitRef}
          className={`flex-1 min-w-0 flex justify-center items-start py-4 sm:py-8 px-2 sm:px-6 overflow-y-auto overflow-x-hidden transition-[padding] duration-500 ${selectedUnit && isDesktop ? "pr-[440px]" : ""}`}
        >
          {/* La baie garde ses proportions réelles (720 px) et est mise à l'échelle de l'espace disponible */}
          <div className="shrink-0" style={{ width: RACK_W * scale, height: rackH * scale }}>
          <div ref={rackRef} className="relative flex flex-col origin-top-left" style={{ width: RACK_W, transform: `scale(${scale})`, filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.7))" }}>
            {/* Toit : tôle perforée (ventilation) et plaque constructeur */}
            <div
              className="h-9 rounded-t-md flex items-center justify-between px-5 relative"
              style={{ background: `linear-gradient(180deg, #2b2e33 0%, #1b1d21 100%)`, borderTop: "1px solid #4a4f57", boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.6)" }}
            >
              <div className="absolute inset-x-24 inset-y-2 rounded-sm opacity-70" style={PERFORATED} />
              <div className="relative z-10 px-2 py-0.5 rounded-sm font-mono text-[9px] tracking-[0.3em] text-white/50" style={{ background: "linear-gradient(180deg,#3a3f46,#24272c)", border: "1px solid #50565f" }}>
                NÉRON · 19" · {UNIT_IDS.length}U
              </div>
              <div className="relative z-10 flex items-center gap-2 px-2 py-0.5 rounded-sm" style={{ background: "#0b0d10", border: "1px solid #333" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: LEVEL_COLOR[globalLevel], boxShadow: `0 0 6px ${LEVEL_COLOR[globalLevel]}` }} />
                <span className="font-mono text-[9px] tabular-nums" style={{ color: "#7dd3fc" }}>
                  {tower?.health?.tiles.find((t) => t.key === "temp")?.value ?? "-- °C"}
                </span>
              </div>
            </div>

            {/* Châssis : montants perforés (trous carrés + repères U) de part et d'autre */}
            <div className="flex" style={{ background: "#0a0b0d", boxShadow: "inset 0 0 30px rgba(0,0,0,0.9)" }}>
              <RackPost side="left" />
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-[2px] py-[3px]" style={{ background: "linear-gradient(90deg, #050607, #0c0d10 50%, #050607)" }}>
                {UNIT_IDS.map((unitId) => (
                  <RackUnitRow
                    key={unitId}
                    unitId={unitId}
                    config={rack[unitId]}
                    live={live[unitId]}
                    height={getSlotHeight(rack[unitId])}
                    isSelected={selectedUnit === unitId}
                    onClick={() => handleUnitClick(unitId)}
                    onConfig={(e) => handleConfigClick(e, unitId)}
                  />
                ))}
              </div>
              <RackPost side="right" />
            </div>

            {/* Socle et roulettes */}
            <div className="h-6 rounded-b-md flex items-center justify-center" style={{ background: "linear-gradient(180deg, #24272c, #141518)", borderBottom: "1px solid #000" }}>
              <div className="w-1/2 h-2.5 rounded-sm opacity-60" style={PERFORATED} />
            </div>
            <div className="flex justify-between px-8">
              {[0, 1].map((i) => (
                <div key={i} className="w-10 h-3 rounded-b-full" style={{ background: "linear-gradient(180deg,#1a1a1a,#050505)" }} />
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedUnit && rack[selectedUnit] && rack[selectedUnit].type !== "blank" && (
            <DetailPanel
              unitId={selectedUnit}
              config={rack[selectedUnit]}
              live={live[selectedUnit]}
              connected={connected}
              isDesktop={isDesktop}
              onClose={() => setSelectedUnit(null)}
              onConfig={() => setConfigUnit(selectedUnit)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-7 border-t border-white/5 bg-black/80 backdrop-blur-md flex items-center px-3 sm:px-4 gap-3 justify-between font-mono text-[10px] text-white/30 z-20 relative shrink-0 pb-[env(safe-area-inset-bottom)] box-content">
        <div className="hidden md:flex gap-4 shrink-0">
          <span>BAIE 19 — INFRASTRUCTURE NÉRON</span>
          <span>•</span>
          <span>{UNIT_IDS.length} UNITÉS</span>
        </div>
        <div className="flex gap-4 min-w-0 w-full md:w-auto justify-between md:justify-end">
          <span className="shrink-0">{currentTime.toISOString().split("T")[0]}</span>
          <span className="truncate">{connected ? `NEXUSTOWER + HOMEBOXSERVER · ${tower ? new Date(tower.generatedAt).toLocaleTimeString("fr-FR") : ""}` : "API INJOIGNABLE"}</span>
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
  live,
  height,
  isSelected,
  onClick,
  onConfig,
}: {
  unitId: UnitId;
  config: SlotConfig;
  live: LiveUnit | null;
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
        className="w-9 h-full flex flex-col items-center justify-between border-r border-black/70 py-1.5 shrink-0 focus:outline-none"
        style={{ background: `${BRUSHED}, linear-gradient(90deg, #2a2d32, #1c1e22)` }}
      >
        <Screw />
        <span className="font-mono text-[9px] text-white/25 font-bold tracking-wide" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {unitId}
        </span>
        <Screw />
      </button>

      {/* Faceplate */}
      <button onClick={onClick} className="flex-1 min-w-0 h-full overflow-hidden focus:outline-none text-left">
        <div className="w-full h-full relative">
          <ServerFaceplate config={config} live={live} isSelected={isSelected} height={height} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `${BRUSHED}, linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%, rgba(0,0,0,0.25))` }} />
        </div>
      </button>

      {/* Right ear — config button appears on hover */}
      <div className="w-9 h-full flex flex-col items-center justify-between border-l border-black/70 py-1.5 shrink-0" style={{ background: `${BRUSHED}, linear-gradient(90deg, #1c1e22, #2a2d32)` }}>
        <Screw />
        {config.type !== "blank" && (
          <div
            title={live ? `État réel : ${LEVEL_LABEL[live.level]}` : "Simulation"}
            className="w-2 h-2 rounded-full"
            style={{ background: live ? LEVEL_COLOR[live.level] : "#334155", boxShadow: live && live.level !== "off" ? `0 0 6px ${LEVEL_COLOR[live.level]}` : "none" }}
          />
        )}
        <button
          onClick={onConfig}
          title="Configurer"
          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-60 transition-opacity duration-150 focus:outline-none"
          style={{ color: config.accentHex }}
        >
          <Settings className="w-3 h-3" />
        </button>
        <Screw />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Faceplate dispatcher — by config.type                         */
/* ─────────────────────────────────────────────────────────────── */

function ServerFaceplate({ config, live, isSelected, height }: { config: SlotConfig; live: LiveUnit | null; isSelected: boolean; height: number }) {
  if (config.type === "switch") return <SwitchFaceplate config={config} live={live} isSelected={isSelected} />;
  if (config.type === "firewall") return <FirewallFaceplate config={config} live={live} isSelected={isSelected} />;
  if (config.type === "nas") return <NASFaceplate config={config} live={live} isSelected={isSelected} />;
  if (config.type === "ups") return <UPSFaceplate config={config} isSelected={isSelected} />;
  if (config.type === "home_assistant") return <HomeAssistantFaceplate config={config} live={live} isSelected={isSelected} />;
  if (config.type === "blank") return <BlankFaceplate config={config} />;
  return <GenericServerFaceplate config={config} live={live} isSelected={isSelected} height={height} />;
}

/* ─────────────────────────────────────────────────────────────── */
/*  Switch faceplate                                               */
/* ─────────────────────────────────────────────────────────────── */

function SwitchFaceplate({ config, live, isSelected }: { config: SwitchConfig; live: LiveUnit | null; isSelected: boolean }) {
  if (live && live.leds.length) return <LiveSwitchFaceplate config={config} live={live} />;
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

function FirewallFaceplate({ config, live, isSelected }: { config: SlotConfig & { type: "firewall" }; live: LiveUnit | null; isSelected: boolean }) {
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

      {live ? <Lcd live={live} /> : (
        <div className="ml-2 px-2 py-1 rounded-sm" style={{ background: "#0a1200", border: "1px solid #1a2800", minWidth: 80 }}>
          <div className="font-mono text-[8px] text-green-400/60 leading-tight">{config.software}</div>
          <div className="font-mono text-[9px] text-green-300/80">SECURE</div>
        </div>
      )}

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

function GenericServerFaceplate({ config, live, isSelected, height }: { config: SlotConfig; live: LiveUnit | null; isSelected: boolean; height: number }) {
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
          <Blinker color={live ? LEVEL_COLOR[live.level] : "#22c55e"} size={4} on interval={4000} />
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
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: driveCount }).map((_, i) => (
            <DriveBay key={i} accentHex={config.accentHex} index={i} led={live?.leds[i]} />
          ))}
          {Array.from({ length: Math.max(0, 6 - driveCount) }).map((_, i) => (
            <div key={`blank-${i}`} className="flex-1" style={{ height: 36, background: "linear-gradient(180deg, #111, #0a0a0a)", border: "1px solid #1a1a1a", borderRadius: 2 }} />
          ))}
        </div>
        {(isGPU || live?.load != null) && <GPUBar accentHex={config.accentHex} value={live?.load ?? undefined} label={isGPU ? "GPU" : "LOAD"} />}
      </div>
      {live && <div className="flex items-center pr-2"><Lcd live={live} /></div>}

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

function HomeAssistantFaceplate({ config, live, isSelected }: { config: SlotConfig & { type: "home_assistant" }; live: LiveUnit | null; isSelected: boolean }) {
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

      {live ? (
        <>
          <div className="flex flex-wrap gap-[3px] max-w-[220px]">
            {live.leds.map((l, i) => <div key={i} title={l.label} className="w-[6px] h-[6px] rounded-full" style={{ background: l.level === "off" ? "#1e293b" : LEVEL_COLOR[l.level], boxShadow: l.level === "off" ? "none" : `0 0 4px ${LEVEL_COLOR[l.level]}` }} />)}
          </div>
          <div className="ml-auto pr-2"><Lcd live={live} /></div>
        </>
      ) : (
        <div className="ml-auto flex flex-col items-end gap-1 pr-2">
          <span className="font-mono text-[10px] font-bold" style={{ color: `${config.accentHex}cc` }}>{config.deviceCount}</span>
          <span className="font-mono text-[7px] text-white/25">APPAREILS</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NAS faceplate                                                  */
/* ─────────────────────────────────────────────────────────────── */

function NASFaceplate({ config, live, isSelected }: { config: NASConfig; live: LiveUnit | null; isSelected: boolean }) {
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
            <NASBay key={i} accentHex={config.accentHex} index={i} led={live?.leds[i]} />
          ))}
          {config.driveCount > 8 && (
            <div className="flex items-center justify-center px-1">
              <span className="font-mono text-[8px] text-white/30">+{config.driveCount - 8}</span>
            </div>
          )}
          {live && <div className="ml-auto"><Lcd live={live} /></div>}
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
  live,
  connected,
  isDesktop,
  onClose,
  onConfig,
}: {
  isDesktop: boolean;
  unitId: UnitId;
  config: SlotConfig;
  live: LiveUnit | null;
  connected: boolean;
  onClose: () => void;
  onConfig: () => void;
}) {
  const { metrics, specs } = useLiveMetrics(config);
  const Icon = TYPE_ICONS[config.type];
  const services = live ? live.tags : getServices(config);
  const source = sourceOf(unitId, config);
  const description = getTypeDescription(config);

  return (
    <>
    {/* Mobile / tablette : voile derrière le tiroir, un tap le ferme */}
    {!isDesktop && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 z-20"
        onClick={onClose}
      />
    )}
    <motion.div
      initial={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      drag={isDesktop ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
      className={
        isDesktop
          ? "absolute top-0 right-0 bottom-0 w-[420px] bg-[#0b0b0b]/96 backdrop-blur-xl border-l border-white/8 shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.9)] z-30 flex flex-col"
          : "absolute inset-x-0 bottom-0 max-h-[82%] rounded-t-2xl bg-[#0b0b0b]/98 backdrop-blur-xl border-t border-white/10 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.9)] z-30 flex flex-col"
      }
    >
      {!isDesktop && <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-white/20 shrink-0" />}
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/5 relative overflow-hidden">
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

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 sm:space-y-7">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Description</h3>
          <p className="text-sm text-white/65 leading-relaxed">{description}</p>
        </div>

        {/* Mesures réelles (NexusTower + HomeboxServer) */}
        {live && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Mesures réelles</h3>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: LEVEL_COLOR[live.level], border: `1px solid ${LEVEL_COLOR[live.level]}50` }}>
                {LEVEL_LABEL[live.level]}
              </span>
            </div>
            <p className="font-mono text-[9px] text-white/35">{LIVE_SOURCE_LABEL[source]}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {live.metrics.map((m, i) => (
                <div key={i} data-testid={`metric-${unitId}-${i}`} className="border rounded p-3 flex flex-col justify-between" style={{ background: "#0f0f0f", borderColor: "#1a1a1a", borderLeft: `3px solid ${LEVEL_COLOR[m.level]}`, minHeight: 76 }}>
                  <span className="font-mono text-[9px] text-white/35">{m.label}</span>
                  <span className="font-mono text-lg font-bold text-white/85 tracking-tight tabular-nums leading-tight break-words">{m.value}</span>
                  {m.note && <span className="font-mono text-[9px] text-white/30">{m.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Télémétrie simulée : unités sans source réelle, ou API injoignable */}
        {!live && specs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">
                Télémétrie simulée {source === "none" ? "· aucune mesure réelle" : !connected ? "· API injoignable" : ""}
              </h3>
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
            <h3 className="font-mono text-[9px] text-white/30 uppercase tracking-widest">{live ? "Détail" : "Services actifs"}</h3>
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

      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-black/20 text-center font-mono text-[9px] text-white/20">
        NÉRON OS // SYSTÈME DE SUPERVISION
      </div>
    </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared sub-components                                          */
/* ─────────────────────────────────────────────────────────────── */

function DriveBay({ accentHex, index, led }: { accentHex: string; index: number; led?: { label: string; level: Level } }) {
  const [rnd] = React.useState(() => Math.random() > 0.15);
  const active = led ? led.level !== "off" : rnd;
  if (led) accentHex = LEVEL_COLOR[led.level];
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

function NASBay({ accentHex, index, led }: { accentHex: string; index: number; led?: { label: string; level: Level } }) {
  const [rnd] = React.useState(() => Math.random() > 0.1);
  const active = led ? led.level !== "off" : rnd;
  if (led) accentHex = LEVEL_COLOR[led.level];
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

function GPUBar({ accentHex, value, label = "GPU" }: { accentHex: string; value?: number; label?: string }) {
  const [rnd, setRnd] = React.useState(70);
  React.useEffect(() => {
    if (value !== undefined) return;
    const t = setInterval(() => setRnd(40 + Math.random() * 55), 1500);
    return () => clearInterval(t);
  }, [value]);
  const width = value !== undefined ? value * 100 : rnd;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[8px] text-white/25 shrink-0 w-7">{label}</span>
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
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (Math.random() > 0.5) setLit((v) => !v);
      id = setTimeout(tick, 200 + Math.random() * 600);
    };
    id = setTimeout(tick, Math.random() * 500);
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

/* ─────────────────────────────────────────────────────────────── */
/*  Châssis et éléments réels                                       */
/* ─────────────────────────────────────────────────────────────── */

/** Montant de baie : tôle pliée avec trous carrés (écrous cage). */
function RackPost({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="w-[18px] shrink-0 relative"
      style={{
        background: `linear-gradient(${side === "left" ? 90 : 270}deg, #3a3e45 0%, #2a2d33 40%, #17191c 100%)`,
        boxShadow: side === "left" ? "inset -2px 0 3px rgba(0,0,0,0.7)" : "inset 2px 0 3px rgba(0,0,0,0.7)",
      }}
    >
      <div
        className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-[7px]"
        style={{ backgroundImage: "linear-gradient(180deg, #050505 0 5px, transparent 5px 14.67px)", backgroundSize: "7px 14.67px" }}
      />
    </div>
  );
}

/** Vis cruciforme de fixation. */
function Screw() {
  return (
    <div
      className="w-3 h-3 rounded-full relative"
      style={{ background: "radial-gradient(circle at 35% 30%, #8b919a, #3d4148 60%, #1a1c1f)", boxShadow: "0 1px 1px rgba(0,0,0,0.9)" }}
    >
      <div className="absolute left-1/2 top-[2px] bottom-[2px] w-px -translate-x-1/2 bg-black/70" />
      <div className="absolute top-1/2 left-[2px] right-[2px] h-px -translate-y-1/2 bg-black/70" />
    </div>
  );
}

/** Petit écran LCD de façade : deux premières mesures réelles, qui défilent toutes les 3 s. */
function Lcd({ live }: { live: LiveUnit }) {
  const [page, setPage] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPage((p) => p + 1), 3000);
    return () => clearInterval(t);
  }, []);
  const m = live.metrics.length ? live.metrics[page % live.metrics.length] : null;
  if (!m) return null;
  return (
    <div
      className="px-2 py-1 rounded-[2px] font-mono leading-tight shrink-0"
      style={{ width: 132, background: "linear-gradient(180deg, #0b1f14, #06140c)", border: "2px solid #0a0a0a", boxShadow: "inset 0 0 8px rgba(0,0,0,0.9), 0 0 0 1px #2a2d32" }}
    >
      <div className="text-[7px] uppercase tracking-wider truncate" style={{ color: "#4ade80aa" }}>{m.label}</div>
      <div className="text-[11px] font-bold truncate" style={{ color: m.level === "off" || m.level === "ok" ? "#86efac" : LEVEL_COLOR[m.level], textShadow: "0 0 4px currentColor" }}>
        {m.value}
      </div>
    </div>
  );
}

/** Switch réel : un port par projet du registre HomeboxServer, diode allumée si son service est en ligne. */
function LiveSwitchFaceplate({ config, live }: { config: SwitchConfig; live: LiveUnit }) {
  return (
    <div className="w-full h-full flex items-center px-4 gap-3 relative" style={{ background: "linear-gradient(180deg, #1a1c1f 0%, #121315 100%)" }}>
      <div className="flex flex-col pr-3 border-r border-white/5 shrink-0" style={{ width: 84 }}>
        <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest leading-tight">{config.speed}</span>
        <span className="font-mono text-[11px] font-bold text-cyan-400/80 tracking-wider leading-tight">SWITCH</span>
        <span className="font-mono text-[7px] text-white/25 tracking-wider leading-tight">{live.leds.length} PROJETS</span>
      </div>
      <div className="flex gap-[3px] min-w-0 overflow-hidden">
        {live.leds.map((l, i) => (
          <div key={i} title={`${l.label} — ${l.level === "ok" ? "en ligne" : "arrêté"}`} className="flex flex-col items-center gap-[3px]">
            <div className="flex gap-[2px]">
              <div className="w-[5px] h-[3px] rounded-[1px]" style={{ background: l.level === "ok" ? "#22c55e" : "#0f1a12", boxShadow: l.level === "ok" ? "0 0 4px #22c55e" : "none" }} />
              {l.active ? <RandomBlinker color="#f59e0b" size={3} /> : <div className="w-[3px] h-[3px] rounded-full bg-[#111]" />}
            </div>
            <div className="w-[16px] h-[14px] rounded-[2px] flex items-end justify-center pb-[2px]" style={{ background: "#08090a", border: "1px solid #2a2d32", boxShadow: "inset 0 2px 3px rgba(0,0,0,0.9)" }}>
              <div className="w-[8px] h-[3px] bg-[#1c1e22]" />
            </div>
            <span className="font-mono text-[6px] text-white/25 leading-none">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="ml-auto shrink-0"><Lcd live={live} /></div>
    </div>
  );
}
