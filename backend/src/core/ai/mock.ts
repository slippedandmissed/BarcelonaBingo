import { AiDriver, type GenerateChallengesInput } from ".";

const SAMPLE_CHALLENGES = [
  "Get another player to compliment your hair.",
  'Get another player to say "you\'re not ugly."',
  "Get another player to correct your grammar.",
  "Get another player to do an impression of you.",
  "Get another player to yawn right after you do.",
  "Make up a word, use it in conversation, and get another player to ask what it means.",
  "Get another player to high-five you twice in the same hour.",
  'Get another player to say "game over."',
  "Get another player to send you a voice note.",
  "Get another player to admit to a minor crime.",
  "Tell a player your phone is voice-activated and get them to try talking to it.",
  "Get another player to ask if you're okay.",
  "Get a movie quote wrong out loud and get another player to correct you.",
  "Get another player to call you instead of texting back.",
  "Get another player to use a nickname for you that you've never gone by.",
  "Get another player to guess your password (let them get it wrong).",
];

export class MockAiDriver extends AiDriver {
  async generateChallenges({ count }: GenerateChallengesInput): Promise<string[]> {
    return Array.from(
      { length: Math.max(count, 1) },
      (_, i) => SAMPLE_CHALLENGES[i % SAMPLE_CHALLENGES.length]!,
    );
  }
}

export default MockAiDriver;
