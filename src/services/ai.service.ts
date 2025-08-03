import Antropic from "@anthropic-ai/sdk";
import { ContentBlock } from "@anthropic-ai/sdk/src/resources/messages.js";

export class AIService {
  private readonly antropic: Antropic;
  private readonly maxRetries: number = 20;
  private readonly baseDelay: number = 1000; // 1 second

  constructor(apiKey: string) {
    this.antropic = new Antropic({ apiKey });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    // Check for connection errors, rate limits, and temporary server errors
    return (
      error.name === "APIConnectionError" ||
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      (error.cause && error.cause.code === "EAI_AGAIN") ||
      (error.message && error.message.includes("getaddrinfo"))
    );
  }

  async summarizeTextToOneSentence(question: string): Promise<string> {
    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(
          `AI API attempt ${attempt + 1}/${this.maxRetries} for text summarization`
        );

        const result = await this.antropic.messages.create({
          model: "claude-3-5-haiku-latest",
          messages: [
            {
              role: "user",
              content: `Суммаризируй следующий текст в одно предложение до 100 символов: ${question}`,
            },
          ],
          max_tokens: 1000,
        });

        console.log(`AI API call successful on attempt ${attempt + 1}`);
        return this.getTextFromAntropicResultContent(result.content);
      } catch (error) {
        lastError = error;
        console.error(
          `AI API attempt ${attempt + 1} failed:`,
          (error as any).message
        );

        if (!this.isRetryableError(error)) {
          console.error("Non-retryable error encountered, stopping retries");
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay =
            this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(
            `Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(delay);
        }
      }
    }

    console.error(
      `All ${this.maxRetries} AI API attempts failed, throwing last error`
    );
    throw lastError;
  }

  getTextFromAntropicResultContent(block: ContentBlock[]) {
    return block
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ");
  }
}
