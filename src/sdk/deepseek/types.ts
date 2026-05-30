export type DeepSeekChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DeepSeekThinking = {
  type: "enabled" | "disabled";
};

export type DeepSeekReasoningEffort = "none" | "low" | "medium" | "high";

export type DeepSeekTextCompletionOptions = {
  model?: string;
  thinking?: DeepSeekThinking;
  reasoningEffort?: DeepSeekReasoningEffort;
  maxCompletionTokens?: number;
};

export type DeepSeekChatCompletionRequest = {
  model: string;
  messages: DeepSeekChatMessage[];
  thinking?: DeepSeekThinking;
  reasoning_effort?: DeepSeekReasoningEffort;
  stream: false;
  max_completion_tokens?: number;
};

export type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type DeepSeekSDKOptions = {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
  baseDelay?: number;
  textCompletion?: DeepSeekTextCompletionOptions;
};
