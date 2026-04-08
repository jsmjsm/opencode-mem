import type { ZodType } from "zod";
type OAuthAuth = {
    type: "oauth";
    refresh: string;
    access: string;
    expires: number;
};
type ApiAuth = {
    type: "api";
    key: string;
};
type Auth = OAuthAuth | ApiAuth;
export declare function setStatePath(path: string): void;
export declare function getStatePath(): string;
export declare function setConnectedProviders(providers: string[]): void;
export declare function isProviderConnected(providerName: string): boolean;
export declare function readOpencodeAuth(statePath: string, providerName: string): Auth;
export declare function createOAuthFetch(statePath: string, providerName: string): (input: string | Request | URL, init?: RequestInit) => Promise<Response>;
export declare function createOpencodeAIProvider(providerName: string, auth: Auth, statePath?: string): import("@ai-sdk/anthropic").AnthropicProvider | import("@ai-sdk/openai").OpenAIProvider;
export declare function generateStructuredOutput<T>(options: {
    providerName: string;
    modelId: string;
    statePath: string;
    systemPrompt: string;
    userPrompt: string;
    schema: ZodType<T>;
    temperature?: number;
}): Promise<T>;
export {};
//# sourceMappingURL=opencode-provider.d.ts.map