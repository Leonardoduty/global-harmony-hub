import express from "express";
import cors from "cors";
import { createDebugEntry, finalizeDebugEntry, debugMiddleware, getLogs, clearLogs } from "./debug.js";
import { handleChat, handleVerifyNews, handleGenerateHeadlines, handleWorldState, handleCountryInfo, handleDecision } from "./engine.js";
import { getOpenAIKey } from "./openai.js";

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(debugMiddleware);

const HANDLERS = {
  chat: handleChat,
  decision: handleDecision,
  verify_news: handleVerifyNews,
  generate_headlines: handleGenerateHeadlines,
  world_state: handleWorldState,
  country_info: handleCountryInfo,
};

app.post("/api/engine", async (req, res) => {
  const { type, ...payload } = req.body ?? {};

  if (!type) {
    return res.status(400).json({ ok: false, error: "Missing required field: type" });
  }

  const handler = HANDLERS[type];
  if (!handler) {
    return res.status(400).json({
      ok: false,
      error: `Unknown type: "${type}". Valid types: ${Object.keys(HANDLERS).join(", ")}`,
    });
  }

  const debugEntry = createDebugEntry(type, payload);

  try {
    const result = await handler(payload);
    const { ai_used, model, error } = result;

    const finalized = finalizeDebugEntry(debugEntry, result, {
      ai_used: ai_used ?? false,
      model: model ?? null,
      error: error ?? null,
      worldStateChange: result.worldStateChanges ?? result.changes ?? null,
    });

    return res.json({
      ok: true,
      type,
      data: result,
      debug: {
        id: finalized.id,
        latency_ms: finalized.latency_ms,
        ai_used: finalized.ai_used,
        model: finalized.model,
        error: finalized.error,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[ENGINE CRASH] ${type}:`, errMsg);

    const finalized = finalizeDebugEntry(debugEntry, null, { error: errMsg, ai_used: false });

    return res.status(500).json({
      ok: false,
      type,
      error: errMsg,
      debug: {
        id: finalized.id,
        latency_ms: finalized.latency_ms,
        ai_used: false,
        model: null,
        error: errMsg,
      },
    });
  }
});

app.get("/api/debug/logs", (req, res) => {
  res.json({ logs: getLogs(), count: getLogs().length });
});

app.delete("/api/debug/logs", (req, res) => {
  clearLogs();
  res.json({ ok: true, message: "Debug logs cleared" });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    openai_configured: !!getOpenAIKey(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  const hasKey = !!getOpenAIKey();
  console.log(`\n[API ENGINE] Running on port ${PORT}`);
  console.log(`[API ENGINE] OpenAI: ${hasKey ? "configured" : "NOT configured — AI features disabled"}`);
  console.log(`[API ENGINE] Endpoints: POST /api/engine, GET /api/debug/logs, GET /api/health\n`);
});
