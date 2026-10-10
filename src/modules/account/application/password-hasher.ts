/** Port for one-way password hashing; the algorithm is an infrastructure choice. */
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  /** Never throws on a malformed hash: it simply does not match. */
  abstract verify(plain: string, hash: string): Promise<boolean>;
}
