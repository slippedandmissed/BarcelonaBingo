import { AiDriver } from ".";

export class MockAiDriver extends AiDriver {
  async generateResponse(_prompt: string): Promise<string> {
    return "AI response";
  }
}

export default MockAiDriver;
