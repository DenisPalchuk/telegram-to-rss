import * as mustache from "mustache";
import * as fs from "fs";
import * as path from "path";
import { DeepSeekSDK } from "../sdk/deepseek/sdk";

export class AIService {
  private readonly deepSeekSdk: DeepSeekSDK;
  private readonly summarizePromptTemplate: string;

  constructor(apiKey: string) {
    this.deepSeekSdk = new DeepSeekSDK({ apiKey });

    const promptPath = path.join(__dirname, "../prompts/summarize-text.md");
    this.summarizePromptTemplate = fs.readFileSync(promptPath, "utf-8");
  }

  async summarizeTextToOneSentence(question: string): Promise<string> {
    const prompt = mustache.render(this.summarizePromptTemplate, {
      text: question,
    });

    return this.deepSeekSdk.createTextCompletion(prompt);
  }
}
