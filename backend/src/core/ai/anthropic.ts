import Anthropic from "@anthropic-ai/sdk";
import { AiDriver } from ".";

export class AnthropicAiDriver extends AiDriver {
  private client: Anthropic;

  constructor({ apiKey }: { apiKey: string }) {
    super();
    this.client = new Anthropic({
      apiKey,
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      model: "claude-haiku-4-5-20251001",
    });
    return message.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("");
  }
}

export default AnthropicAiDriver;
