import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
// --- State (set from plugin init in index.ts, Task 4) ---
let _statePath = null;
let _connectedProviders = [];
export function setStatePath(path) {
    _statePath = path;
}
export function getStatePath() {
    if (!_statePath) {
        throw new Error("opencode state path not initialized. Plugin may not be fully started.");
    }
    return _statePath;
}
export function setConnectedProviders(providers) {
    _connectedProviders = providers;
}
export function isProviderConnected(providerName) {
    return _connectedProviders.includes(providerName);
}
// --- Auth ---
function findAuthJsonPath(statePath) {
    const candidates = [
        join(statePath, "auth.json"),
        join(dirname(statePath), "share", "opencode", "auth.json"),
        join(statePath.replace("/state/", "/share/"), "auth.json"),
    ];
    return candidates.find(existsSync);
}
export function readOpencodeAuth(statePath, providerName) {
    const authPath = findAuthJsonPath(statePath);
    let raw;
    if (authPath) {
        try {
            raw = readFileSync(authPath, "utf-8");
        }
        catch { }
    }
    if (!raw || !authPath) {
        throw new Error(`opencode auth.json not found at ${authPath ?? statePath}. Is opencode authenticated?`);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error(`Failed to read opencode auth.json: invalid JSON`);
    }
    const auth = parsed[providerName];
    if (!auth) {
        const connected = Object.keys(parsed).join(", ") || "none";
        throw new Error(`Provider '${providerName}' not found in opencode auth.json. Connected providers: ${connected}`);
    }
    return auth;
}
// --- OAuth Fetch ---
const OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const OAUTH_TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const OAUTH_REQUIRED_BETAS = ["oauth-2025-04-20", "interleaved-thinking-2025-05-14"];
const MCP_TOOL_PREFIX = "mcp_";
export function createOAuthFetch(statePath, providerName) {
    return async (input, init) => {
        let auth = readOpencodeAuth(statePath, providerName);
        // Refresh token if expired
        if (!auth.access || auth.expires < Date.now()) {
            const refreshResponse = await fetch(OAUTH_TOKEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grant_type: "refresh_token",
                    refresh_token: auth.refresh,
                    client_id: OAUTH_CLIENT_ID,
                }),
            });
            if (!refreshResponse.ok) {
                throw new Error(`OAuth token refresh failed: ${refreshResponse.status}`);
            }
            const json = (await refreshResponse.json());
            auth = {
                type: "oauth",
                refresh: json.refresh_token,
                access: json.access_token,
                expires: Date.now() + json.expires_in * 1000,
            };
            const authPath = findAuthJsonPath(statePath);
            if (authPath) {
                try {
                    const allAuth = JSON.parse(readFileSync(authPath, "utf-8"));
                    allAuth[providerName] = auth;
                    writeFileSync(authPath, JSON.stringify(allAuth));
                }
                catch { }
            }
        }
        // Build headers
        const requestInit = init ?? {};
        const requestHeaders = new Headers();
        if (input instanceof Request) {
            input.headers.forEach((value, key) => requestHeaders.set(key, value));
        }
        if (requestInit.headers) {
            if (requestInit.headers instanceof Headers) {
                requestInit.headers.forEach((value, key) => requestHeaders.set(key, value));
            }
            else if (Array.isArray(requestInit.headers)) {
                for (const pair of requestInit.headers) {
                    const [key, value] = pair;
                    if (typeof value !== "undefined")
                        requestHeaders.set(key, value);
                }
            }
            else {
                for (const [key, value] of Object.entries(requestInit.headers)) {
                    if (typeof value !== "undefined")
                        requestHeaders.set(key, String(value));
                }
            }
        }
        // Merge beta headers
        const incomingBeta = requestHeaders.get("anthropic-beta") ?? "";
        const incomingBetas = incomingBeta
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
        const mergedBetas = [...new Set([...OAUTH_REQUIRED_BETAS, ...incomingBetas])].join(",");
        requestHeaders.set("authorization", `Bearer ${auth.access}`);
        requestHeaders.set("anthropic-beta", mergedBetas);
        requestHeaders.set("user-agent", "claude-cli/2.1.2 (external, cli)");
        requestHeaders.delete("x-api-key");
        // Prefix tool names in request body
        let body = requestInit.body;
        if (body && typeof body === "string") {
            try {
                const parsed = JSON.parse(body);
                if (parsed.tools && Array.isArray(parsed.tools)) {
                    parsed.tools = parsed.tools.map((tool) => ({
                        ...tool,
                        name: tool.name ? `${MCP_TOOL_PREFIX}${tool.name}` : tool.name,
                    }));
                }
                if (parsed.messages && Array.isArray(parsed.messages)) {
                    parsed.messages = parsed.messages.map((msg) => {
                        if (msg.content && Array.isArray(msg.content)) {
                            msg.content = msg.content.map((block) => {
                                if (block.type === "tool_use" && block.name) {
                                    return { ...block, name: `${MCP_TOOL_PREFIX}${block.name}` };
                                }
                                return block;
                            });
                        }
                        return msg;
                    });
                }
                body = JSON.stringify(parsed);
            }
            catch { }
        }
        // Modify URL: add ?beta=true to /v1/messages
        let requestInput = input;
        try {
            let requestUrl = null;
            if (typeof input === "string" || input instanceof URL) {
                requestUrl = new URL(input.toString());
            }
            else if (input instanceof Request) {
                requestUrl = new URL(input.url);
            }
            if (requestUrl?.pathname === "/v1/messages" && !requestUrl.searchParams.has("beta")) {
                requestUrl.searchParams.set("beta", "true");
                requestInput =
                    input instanceof Request ? new Request(requestUrl.toString(), input) : requestUrl;
            }
        }
        catch { }
        const response = await fetch(requestInput, { ...requestInit, body, headers: requestHeaders });
        // Strip mcp_ prefix from tool names in streaming response
        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async pull(controller) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }
                    let text = decoder.decode(value, { stream: true });
                    text = text.replace(/"name"\s*:\s*"mcp_([^"]+)"/g, '"name": "$1"');
                    controller.enqueue(encoder.encode(text));
                },
            });
            return new Response(stream, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
        }
        return response;
    };
}
// --- Provider ---
export function createOpencodeAIProvider(providerName, auth, statePath) {
    if (providerName === "anthropic") {
        if (auth.type === "oauth") {
            if (!statePath)
                throw new Error("statePath is required for OAuth authentication");
            return createAnthropic({
                apiKey: "",
                fetch: createOAuthFetch(statePath, providerName),
            });
        }
        return createAnthropic({ apiKey: auth.key });
    }
    if (providerName === "openai") {
        if (auth.type === "oauth") {
            throw new Error("OpenAI does not support OAuth authentication. Use an API key instead.");
        }
        return createOpenAI({ apiKey: auth.key });
    }
    throw new Error(`Unsupported opencode provider: '${providerName}'. Supported providers: anthropic, openai`);
}
// --- Structured Output ---
export async function generateStructuredOutput(options) {
    const auth = readOpencodeAuth(options.statePath, options.providerName);
    const provider = createOpencodeAIProvider(options.providerName, auth, options.statePath);
    const result = await generateText({
        model: provider(options.modelId),
        system: options.systemPrompt,
        prompt: options.userPrompt,
        output: Output.object({ schema: options.schema }),
        temperature: options.temperature ?? 0.3,
    });
    return result.output;
}
