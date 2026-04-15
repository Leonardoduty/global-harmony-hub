import { randomUUID } from "crypto";

const MAX_LOGS = 200;
const logs = [];

export function createDebugEntry(type, request) {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    request,
    response: null,
    latency_ms: null,
    ai_used: false,
    model: null,
    error: null,
    worldStateChange: null,
    _startTime: Date.now(),
  };
}

export function finalizeDebugEntry(entry, response, options = {}) {
  entry.latency_ms = Date.now() - entry._startTime;
  entry.response = response;
  entry.ai_used = options.ai_used ?? false;
  entry.model = options.model ?? null;
  entry.error = options.error ?? null;
  entry.worldStateChange = options.worldStateChange ?? null;
  delete entry._startTime;

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS);

  const status = entry.error ? "ERROR" : "OK";
  const ms = entry.latency_ms;
  const ai = entry.ai_used ? `[${entry.model}]` : "[fallback]";
  console.log(`[ENGINE] ${entry.type.toUpperCase()} ${status} ${ai} ${ms}ms — id:${entry.id.slice(0, 8)}`);
  if (entry.error) console.error(`[ENGINE ERROR]`, entry.error);

  return entry;
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs.splice(0, logs.length);
}

export function debugMiddleware(req, res, next) {
  const start = Date.now();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - start;
    if (req.path !== "/api/debug/logs") {
      console.log(`[HTTP] ${req.method} ${req.path} — ${res.statusCode} — ${ms}ms`);
    }
    return origJson(body);
  };
  next();
}
