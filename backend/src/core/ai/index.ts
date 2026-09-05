export abstract class AiDriver {
  abstract generateResponse(prompt: string): Promise<string>;
}
