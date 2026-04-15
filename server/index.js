import express from "express";
import cors from "cors";
import { createDebugEntry, finalizeDebugEntry, debugMiddleware, getLogs, clearLogs } from "./debug.js";
import { handleChat, handleVerifyNews, handleGenerateHeadlines, handleWorldState, handleCountryInfo, handleDecision, handleDebug, recordEngineHit, recordEngineError } from "./engine.js";
import { getOpenAIKey } from "./openai.js";
import { getWorldState } from "./worldState.js";

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
  debug: handleDebug,
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

  recordEngineHit(type, payload);
  const debugEntry = createDebugEntry(type, payload);
  const worldStateBefore = getWorldState();

  try {
    const result = await handler(payload);
    const { ai_used, model, error, ai_flow, provider } = result;
    const worldStateAfter = getWorldState();

    const finalized = finalizeDebugEntry(debugEntry, result, {
      ai_used: ai_used ?? false,
      model: model ?? null,
      error: error ?? null,
      worldStateChange: result.worldStateChanges ?? result.changes ?? null,
    });

    const aiFlow = ai_flow ?? {
      openrouter_attempted: false, openrouter_success: false, openrouter_error: null,
      openai_attempted: false, openai_success: false, openai_error: null,
    };

    const aiProviderUsed = provider ?? (ai_used ? "unknown" : "none");
    const openrouterStatus = aiFlow.openrouter_skipped ? "skipped"
      : !aiFlow.openrouter_attempted ? "skipped"
      : aiFlow.openrouter_success ? "success" : "failed";
    const openaiStatus = aiFlow.openai_skipped ? "skipped"
      : !aiFlow.openai_attempted ? "skipped"
      : aiFlow.openai_success ? "success" : "failed";

    return res.json({
      ok: true,
      type,
      data: result,
      debug: {
        engine_hit: true,
        type,
        id: finalized.id,
        latency_ms: finalized.latency_ms,
        ai_used: finalized.ai_used,
        model: finalized.model,
        ai_provider_used: aiProviderUsed,
        openrouter_status: openrouterStatus,
        openai_status: openaiStatus,
        ai_flow: aiFlow,
        errors: error ? [{ type, error }] : [],
        raw_errors: aiFlow.openrouter_error || aiFlow.openai_error ? [
          aiFlow.openrouter_error, aiFlow.openai_error,
        ].filter(Boolean) : [],
        request_payload: payload,
        world_state_before: worldStateBefore,
        world_state_after: worldStateAfter,
        ...(result.warning ? { warning: result.warning } : {}),
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[ENGINE CRASH] ${type}:`, errMsg);
    recordEngineError(type, errMsg);

    const finalized = finalizeDebugEntry(debugEntry, null, { error: errMsg, ai_used: false });
    const worldStateAfter = getWorldState();

    return res.status(500).json({
      ok: false,
      type,
      error: errMsg,
      debug: {
        engine_hit: true,
        type,
        id: finalized.id,
        latency_ms: finalized.latency_ms,
        ai_used: false,
        model: null,
        ai_provider_used: "none",
        openrouter_status: "failed",
        openai_status: "failed",
        ai_flow: null,
        errors: [{ type, error: errMsg }],
        raw_errors: [errMsg],
        request_payload: payload,
        world_state_before: worldStateBefore,
        world_state_after: worldStateAfter,
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
  const key = getOpenAIKey();
  res.json({
    ok: true,
    status: "running",
    openai_configured: !!key,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  const hasKey = !!getOpenAIKey();
  console.log(`\n[API ENGINE] Running on port ${PORT}`);
  console.log(`[API ENGINE] OpenAI: ${hasKey ? "configured" : "NOT configured — AI features disabled"}`);
  console.log(`[API ENGINE] Dual-AI: OpenRouter (primary) → OpenAI (fallback)`);
  console.log(`[API ENGINE] Endpoints: POST /api/engine, GET /api/debug/logs, GET /api/health\n`);
});
