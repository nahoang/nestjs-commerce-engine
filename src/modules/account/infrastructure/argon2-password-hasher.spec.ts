import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(await hasher.verify('correct horse battery', hash)).toBe(true);
    expect(await hasher.verify('wrong password', hash)).toBe(false);
  });

  it('never stores the plain password and salts every hash', async () => {
    const first = await hasher.hash('same-password');
    const second = await hasher.hash('same-password');
    expect(first).not.toContain('same-password');
    expect(first.startsWith('$argon2id$')).toBe(true);
    expect(first).not.toBe(second);
  });

  it('treats a malformed hash as a mismatch instead of throwing', async () => {
    await expect(hasher.verify('anything', 'not-a-hash')).resolves.toBe(false);
  });
});
