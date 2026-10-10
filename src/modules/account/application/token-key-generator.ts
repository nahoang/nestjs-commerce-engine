/** Port that produces the random per-user key embedded in access tokens. */
export abstract class TokenKeyGenerator {
  /** At least 128 bits of entropy, at most 64 characters (column limit). */
  abstract generate(): string;
}
