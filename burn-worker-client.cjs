// burn-worker-client.cjs
// Helper for calling your CRYPTOCARDS burn worker on Railway

const BURN_WORKER_URL = process.env.BURN_WORKER_URL;
const BURN_WORKER_AUTH_TOKEN = process.env.BURN_WORKER_AUTH_TOKEN;

// Basic safety checks when backend starts
function checkBurnEnv() {
  if (!BURN_WORKER_URL) {
    console.error("❌ Missing BURN_WORKER_URL in Render env vars");
    return false;
  }
  if (!BURN_WORKER_AUTH_TOKEN) {
    console.error("❌ Missing BURN_WORKER_AUTH_TOKEN in Render env vars");
    return false;
  }
  return true;
}

/**
 * Call the burn worker's /run-burn endpoint.
 * Returns JSON from the worker:
 *   { ok: true, signature: "...", ... } or { ok: false, ... }
 */
async function runBurnNow() {
  if (!checkBurnEnv()) {
    return { ok: false, error: "missing_backend_env" };
  }

  const url = `${BURN_WORKER_URL.replace(/\/+$/, "")}/run-burn`;

  console.log("[BURN] Calling burn worker:", url);

  try {
    // Node 18+ and Bun both have global fetch
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-burn-auth": BURN_WORKER_AUTH_TOKEN,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));

    console.log("[BURN] Worker response:", data);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.error || "burn_worker_http_error",
      };
    }

    return data;
  } catch (err) {
    console.error("[BURN] Error calling worker:", err);
    return {
      ok: false,
      error: err.message || "burn_worker_request_failed",
    };
  }
}



// Run burn worker on an interval (e.g., every minute). Returns a stop() function.
function startBurnCron(intervalMs = 60_000) {
  if (!checkBurnEnv()) return () => {};
  let running = false;

  console.log(`[BURN] Burn cron started (every ${Math.round(intervalMs / 1000)}s).`);

  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const result = await runBurnNow();
      if (result?.ok) {
        console.log("[BURN] Cron burn ok:", result);
      } else {
        console.log("[BURN] Cron burn result:", result);
      }
    } catch (err) {
      console.error("[BURN] Cron burn error:", err);
    } finally {
      running = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}


module.exports = {
  runBurnNow,
  checkBurnEnv,
  startBurnCron,
};
