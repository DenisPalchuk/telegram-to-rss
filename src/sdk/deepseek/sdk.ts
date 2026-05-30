import {
  DeepSeekChatCompletionRequest,
  DeepSeekChatCompletionResponse,
  DeepSeekSDKOptions,
  DeepSeekTextCompletionOptions,
} from "./types";

export class DeepSeekAPIError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "DeepSeekAPIError";
  }
}

export class DeepSeekSDK {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly textCompletionDefaults: Required<DeepSeekTextCompletionOptions>;

  constructor(options: DeepSeekSDKOptions) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? "https://api.deepseek.com";
    this.maxRetries = options.maxRetries ?? 20;
    this.baseDelay = options.baseDelay ?? 1000;
    this.textCompletionDefaults = {
      model: "deepseek-v4-flash",
      thinking: { type: "disabled" },
      reasoningEffort: "none",
      maxCompletionTokens: 120,
      ...options.textCompletion,
    };
  }

  async createTextCompletion(
    prompt: string,
    options: DeepSeekTextCompletionOptions = {}
  ): Promise<string> {
    const completionOptions = {
      ...this.textCompletionDefaults,
      ...options,
    };

    const result = await this.withRetries(() =>
      this.createChatCompletion({
        model: completionOptions.model,
        messages: [
          {
            role: "system",
            content: prompt,
          },
        ],
        thinking: completionOptions.thinking,
        reasoning_effort: completionOptions.reasoningEffort,
        stream: false,
        max_completion_tokens: completionOptions.maxCompletionTokens,
      })
    );

    return this.getTextFromResponse(result);
  }

  private async createChatCompletion(
    request: DeepSeekChatCompletionRequest
  ): Promise<DeepSeekChatCompletionResponse> {
    const response = await fetch(this.getURL("/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new DeepSeekAPIError(
        `DeepSeek API request failed with ${response.status}: ${await response.text()}`,
        response.status
      );
    }

    return (await response.json()) as DeepSeekChatCompletionResponse;
  }

  private async withRetries<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          await this.sleep(
            this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000
          );
        }
      }
    }

    throw lastError;
  }

  private getTextFromResponse(response: DeepSeekChatCompletionResponse) {
    const normalizedText = response.choices?.[0]?.message?.content?.trim();
    if (!normalizedText) {
      throw new Error("DeepSeek response did not contain text output");
    }

    return normalizedText;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof DeepSeekAPIError) {
      return (
        error.status === 408 ||
        error.status === 409 ||
        error.status === 429 ||
        error.status === 500 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504
      );
    }

    if (!(error instanceof Error)) {
      return false;
    }

    const errorWithCode = error as Error & {
      code?: string;
      cause?: { code?: string };
    };

    return (
      (error.name === "TypeError" && error.message.includes("fetch failed")) ||
      errorWithCode.code === "ECONNRESET" ||
      errorWithCode.code === "ETIMEDOUT" ||
      errorWithCode.cause?.code === "EAI_AGAIN" ||
      errorWithCode.cause?.code === "ECONNRESET" ||
      errorWithCode.cause?.code === "ETIMEDOUT" ||
      error.message.includes("getaddrinfo")
    );
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getURL(path: string) {
    return `${this.baseURL.replace(/\/$/, "")}${path}`;
  }
}
