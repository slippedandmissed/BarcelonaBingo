export interface GenerateChallengesInput {
  /** The stable instructions / persona / style. Goes in the `system` slot. */
  system: string;
  /** The request specific to this player and roster. Goes in the `user` slot. */
  user: string;
  /**
   * How many challenges to ask for. Drivers may return slightly fewer; callers
   * must cope with that. Also used to size the mock driver's output.
   */
  count: number;
}

export abstract class AiDriver {
  /** Returns a list of ready-to-use challenge strings (already trimmed, non-empty). */
  abstract generateChallenges(input: GenerateChallengesInput): Promise<string[]>;
}
