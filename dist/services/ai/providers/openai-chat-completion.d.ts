import { BaseAIProvider, type ToolCallResult } from "./base-provider.js";
import { AISessionManager } from "../session/ai-session-manager.js";
import type { ChatCompletionTool } from "../tools/tool-schema.js";
export declare class OpenAIChatCompletionProvider extends BaseAIProvider {
    private aiSessionManager;
    constructor(config: any, aiSessionManager: AISessionManager);
    getProviderName(): string;
    supportsSession(): boolean;
    private addToolResponse;
    private filterIncompleteToolCallSequences;
    executeToolCall(systemPrompt: string, userPrompt: string, toolSchema: ChatCompletionTool, sessionId: string): Promise<ToolCallResult>;
}
//# sourceMappingURL=openai-chat-completion.d.ts.map