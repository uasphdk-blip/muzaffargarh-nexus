const JSON_HEADERS = {
    "content-type": "application/json; charset=UTF-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
};

function corsHeaders(request) {
    const origin = request.headers.get("Origin");
    const headers = { ...JSON_HEADERS, vary: "Origin" };
    let sameOrigin = false;
    try {
        sameOrigin = Boolean(origin) && new URL(request.url).origin === origin;
    } catch (error) {
        console.warn("Ignoring malformed request origin.");
    }
    if (sameOrigin) {
        headers["access-control-allow-origin"] = origin;
        headers["access-control-allow-methods"] = "GET, OPTIONS";
        headers["access-control-allow-headers"] = "Content-Type";
    }
    return headers;
}

function jsonResponse(body, status, request) {
    return new Response(JSON.stringify(body), {
        status,
        headers: corsHeaders(request)
    });
}

const UPSTREAM_TIMEOUT_MS = 20000;
const MAX_UPSTREAM_ATTEMPTS = 3;

async function fetchUpstream(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_UPSTREAM_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { accept: "application/json", "cache-control": "no-cache" },
                redirect: "follow",
                signal: controller.signal
            });
            if (response.ok) return response;
            if (response.status < 500 && response.status !== 429) return response;
            lastError = new Error(`Upstream status ${response.status}`);
        } catch (error) {
            lastError = error;
        } finally {
            clearTimeout(timeout);
        }
        if (attempt < MAX_UPSTREAM_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
    }
    throw lastError || new Error("Upstream request failed");
}

export async function onRequestOptions({ request }) {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestGet({ request, env }) {
    const upstreamUrl = env.GOOGLE_APPS_SCRIPT_URL;
    if (!upstreamUrl) {
        return jsonResponse({ error: "Data service is not configured." }, 503, request);
    }

    let upstream;
    try {
        upstream = await fetchUpstream(upstreamUrl);
    } catch (error) {
        console.error("Data service request failed:", error);
        return jsonResponse({ error: "Unable to reach the data service." }, 502, request);
    }

    if (!upstream.ok) {
        console.error("Data service returned status:", upstream.status);
        return jsonResponse({ error: "The data service returned an error." }, 502, request);
    }

    let data;
    try {
        data = await upstream.json();
    } catch (error) {
        console.error("Data service returned invalid JSON:", error);
        return jsonResponse({ error: "The data service returned invalid data." }, 502, request);
    }

    if (!Array.isArray(data)) {
        return jsonResponse({ error: "The data service returned an unexpected response." }, 502, request);
    }

    return jsonResponse(data, 200, request);
}

export async function onRequest({ request, env }) {
    if (request.method === "GET") return onRequestGet({ request, env });
    if (request.method === "OPTIONS") return onRequestOptions({ request });
    return jsonResponse({ error: "Method not allowed." }, 405, request);
}
