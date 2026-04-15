import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Trash2, Bug, ChevronDown, ChevronRight, Wifi, WifiOff, Clock, Cpu, AlertTriangle, CheckCircle } from "lucide-react";
import { fetchDebugLogs, clearDebugLogs, type DebugLog } from "@/lib/apiEngine";

const TYPE_COLORS: Record<string, string> = {
  chat: "text-blue-400",
  decision: "text-purple-400",
  verify_news: "text-amber-400",
  generate_headlines: "text-green-400",
  world_state: "text-cyan-400",
  country_info: "text-pink-400",
};

function LogEntry({ log }: { log: DebugLog }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = TYPE_COLORS[log.type] ?? "text-foreground";
  const hasError = !!log.error;

  return (
    <div className={`border rounded-md p-2 text-xs font-mono transition-colors ${hasError ? "border-red-500/40 bg-red-500/5" : "border-border bg-muted/30"}`}>
      <button
        className="w-full flex items-center gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <span className={`font-bold uppercase ${typeColor}`}>{log.type}</span>
        <span className="text-muted-foreground ml-auto">{log.latency_ms}ms</span>
        {log.ai_used ? (
          <span className="flex items-center gap-1 text-green-400"><Wifi className="w-3 h-3" />{log.model}</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-400"><WifiOff className="w-3 h-3" />fallback</span>
        )}
        {hasError ? (
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
        ) : (
          <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
        )}
      </button>

      <div className="flex items-center gap-2 mt-0.5 pl-5 text-[10px] text-muted-foreground">
        <Clock className="w-2.5 h-2.5" />
        {new Date(log.timestamp).toLocaleTimeString()}
        <span className="opacity-50">#{log.id.slice(0, 8)}</span>
      </div>

      {hasError && (
        <div className="mt-1 pl-5 text-red-400 text-[10px]">
          ERROR: {log.error}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-5 space-y-2">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Request Payload</div>
                <pre className="text-[10px] bg-black/30 p-2 rounded overflow-auto max-h-32 text-foreground/80">
                  {JSON.stringify(log.request, null, 2)}
                </pre>
              </div>
              {log.response && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">Response Payload</div>
                  <pre className="text-[10px] bg-black/30 p-2 rounded overflow-auto max-h-48 text-foreground/80">
                    {JSON.stringify(log.response, null, 2)}
                  </pre>
                </div>
              )}
              {log.worldStateChange && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">World State Changes</div>
                  <pre className="text-[10px] bg-purple-500/10 border border-purple-500/30 p-2 rounded overflow-auto max-h-32 text-purple-300">
                    {JSON.stringify(log.worldStateChange, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "down">("unknown");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDebugLogs();
      setLogs(data);
      setApiStatus("ok");
    } catch {
      setApiStatus("down");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = async () => {
    await clearDebugLogs();
    setLogs([]);
  };

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !autoRefresh) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [open, autoRefresh, refresh]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const errorCount = logs.filter((l) => l.error).length;
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-border text-xs font-mono text-foreground/70 hover:text-foreground hover:border-primary/50 transition-all shadow-lg"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <Bug className="w-3.5 h-3.5" />
        DEBUG
        {errorCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{errorCount}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[100] w-[420px] bg-background/95 backdrop-blur-sm border-r border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold text-sm">DEBUG PANEL</span>
                <span className={`w-2 h-2 rounded-full ${apiStatus === "ok" ? "bg-green-500" : apiStatus === "down" ? "bg-red-500" : "bg-amber-500"}`} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAutoRefresh((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${autoRefresh ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  title="Toggle auto-refresh every 3s"
                >
                  AUTO
                </button>
                <button onClick={refresh} className="p-1.5 rounded hover:bg-muted transition-colors" title="Refresh logs">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={handleClear} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-400" title="Clear logs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 border-b border-border shrink-0 text-center">
              <div className="bg-muted/50 rounded-md p-2">
                <div className="text-lg font-bold font-mono">{logs.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Requests</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2">
                <div className={`text-lg font-bold font-mono ${errorCount > 0 ? "text-red-400" : "text-green-400"}`}>{errorCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Errors</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2">
                <div className="text-lg font-bold font-mono flex items-center justify-center gap-0.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />{avgLatency}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Avg ms</div>
              </div>
            </div>

            <div className="p-3 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <Cpu className="w-3 h-3" />
                POST /api/engine — Ctrl+Shift+D to toggle
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm font-mono">
                  <Bug className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div>No requests logged yet.</div>
                  <div className="text-xs mt-1 opacity-60">Interact with the app to see requests here.</div>
                </div>
              ) : (
                logs.map((log) => <LogEntry key={log.id} log={log} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
