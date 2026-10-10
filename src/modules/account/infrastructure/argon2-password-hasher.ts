import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../application/password-hasher';

/**
 * argon2id with the library defaults (64 MiB memory, 3 passes, 4 lanes), above
 * the OWASP minimum. The salt and parameters are embedded in the encoded hash,
 * so parameters can be raised later without breaking existing hashes.
 */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // A malformed hash is a mismatch, not a server error
      return false;
    }
  }
}
