import { RandomTokenKeyGenerator } from './random-token-key.generator';

describe('RandomTokenKeyGenerator', () => {
  const generator = new RandomTokenKeyGenerator();

  it('produces 256 bits as 64 hex characters (fits varchar(64), R3)', () => {
    expect(generator.generate()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a different key every time', () => {
    expect(generator.generate()).not.toBe(generator.generate());
  });
});
