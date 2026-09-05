import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { AiDriver, type GenerateChallengesInput } from ".";

// Structured output: the model must return { "challenges": string[] }, so we
// never have to guess how it formatted a list.
const CHALLENGES_FORMAT = jsonSchemaOutputFormat({
  type: "object",
  additionalProperties: false,
  properties: {
    challenges: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["challenges"],
} as const);

export class AnthropicAiDriver extends AiDriver {
  private client: Anthropic;

  constructor({ apiKey }: { apiKey: string }) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async generateChallenges({ system, user, count }: GenerateChallengesInput): Promise<string[]> {
    const message = await this.client.messages.parse({
      model: "claude-haiku-4-5",
      // Challenges are short; this is generous headroom for ~50 of them plus the
      // JSON wrapper. Bump (and switch to streaming) if the batch size grows a lot.
      max_tokens: 8192,
      system: [
        // The system prompt is identical for every player in a game, so let the
        // API cache it across the back-to-back calls a game start makes.
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: user }],
      output_config: { format: CHALLENGES_FORMAT },
    });

    const challenges = (message.parsed_output?.challenges ?? [])
      .map((challenge) => challenge.trim())
      .filter((challenge) => challenge.length > 0);

    if (challenges.length === 0) {
      throw new Error(`AI returned no usable challenges (stop_reason: ${message.stop_reason})`);
    }
    if (challenges.length < count) {
      console.warn(
        { requested: count, received: challenges.length },
        "AI returned fewer challenges than requested",
      );
    }
    return challenges;
  }
}

export default AnthropicAiDriver;
