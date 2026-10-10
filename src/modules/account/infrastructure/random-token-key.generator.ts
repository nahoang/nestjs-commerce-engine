import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TokenKeyGenerator } from '../application/token-key-generator';

/** 32 random bytes (256 bits) as 64 hex characters, the size of the `token_key` column. */
@Injectable()
export class RandomTokenKeyGenerator extends TokenKeyGenerator {
  generate(): string {
    return randomBytes(32).toString('hex');
  }
}
