import Antropic from "@anthropic-ai/sdk";
import { ContentBlock } from "@anthropic-ai/sdk/src/resources/messages.js";

export class AIService {
  private readonly antropic: Antropic;
  constructor(apiKey: string) {
    this.antropic = new Antropic({ apiKey });
  }
  async summarizeTextToOneSentense(question: string) {
    const result = await this.antropic.messages.create({
      model: "claude-3-5-haiku-latest",
      messages: [
        {
          role: "user",
          content: `Суммаризируй следующий текст в одно предложение(дай название): ${question}`,
        },
      ],
      max_tokens: 1000,
    });

    console.log(result);
    return this.getTextFromAntropicResultContent(result.content);
  }

  getTextFromAntropicResultContent(block: ContentBlock[]) {
    return block
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ");
  }
}
