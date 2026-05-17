import OpenAI from "openai";
import * as mustache from "mustache";
import * as fs from "fs";
import * as path from "path";

export class AIService {
  private readonly openai: OpenAI;
  private readonly maxRetries: number = 20;
  private readonly baseDelay: number = 1000;
  private readonly summarizePromptTemplate: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });

    const promptPath = path.join(__dirname, "../prompts/summarize-text.md");
    this.summarizePromptTemplate = fs.readFileSync(promptPath, "utf-8");
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    return (
      error.name === "APIConnectionError" ||
      error.name === "RateLimitError" ||
      error.status === 408 ||
      error.status === 409 ||
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      (error.cause && error.cause.code === "EAI_AGAIN") ||
      (error.cause && error.cause.code === "ECONNRESET") ||
      (error.cause && error.cause.code === "ETIMEDOUT") ||
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

        const prompt = mustache.render(this.summarizePromptTemplate, {
          text: question,
        });

        const result = await this.openai.responses.create({
          model: "gpt-5.4-mini",
          reasoning: { effort: "none" },
          input: prompt,
          max_output_tokens: 120,
        });

        console.log(`AI API call successful on attempt ${attempt + 1}`);
        return this.getTextFromResponse(result.output_text);
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

  getTextFromResponse(text: string | null | undefined) {
    const normalizedText = text?.trim();
    if (!normalizedText) {
      throw new Error("OpenAI response did not contain text output");
    }

    return normalizedText;
  }
}
