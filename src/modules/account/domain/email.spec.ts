import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Email } from './email';

describe('Email', () => {
  it('trims and lower-cases the address', () => {
    expect(Email.create('  Lan@Example.COM ').value).toBe('lan@example.com');
  });

  it('treats addresses that differ only by case as equal', () => {
    expect(
      Email.create('Lan@Example.com').equals(Email.create('LAN@example.COM')),
    ).toBe(true);
  });

  it.each(['', '   ', 'plain', 'a@b', '@example.com', 'a b@example.com'])(
    'rejects %p',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(InvalidValueException);
    },
  );

  it('rejects an address longer than 255 characters', () => {
    expect(() => Email.create(`${'a'.repeat(250)}@example.com`)).toThrow(
      InvalidValueException,
    );
  });

  it('reports the offending field', () => {
    expect.assertions(1);
    try {
      Email.create('nope');
    } catch (error) {
      expect((error as InvalidValueException).field).toBe('email');
    }
  });
});
