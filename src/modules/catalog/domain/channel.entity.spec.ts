import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Channel } from './channel.entity';
import { Slug } from './slug';

describe('Channel — DOMAIN-SPEC-1-CATALOG § 1.7', () => {
  const newChannel = (): Channel =>
    new Channel({
      name: 'VN Store',
      slug: Slug.create('vn-store'),
      currency: 'vnd',
    });

  it('R3: a new channel is active and its currency is normalized', () => {
    const channel = newChannel();
    expect(channel.isActive).toBe(true);
    expect(channel.currency).toBe('VND');
  });

  it('rejects an invalid currency or an empty name', () => {
    expect(
      () =>
        new Channel({ name: 'X', slug: Slug.create('x'), currency: 'dong' }),
    ).toThrow(InvalidValueException);
    expect(
      () =>
        new Channel({ name: '  ', slug: Slug.create('x'), currency: 'VND' }),
    ).toThrow(InvalidValueException);
  });

  it('deactivate and activate toggle the flag and are idempotent', () => {
    const channel = newChannel();
    channel.deactivate();
    expect(channel.isActive).toBe(false);
    channel.deactivate();
    expect(channel.isActive).toBe(false);
    channel.activate();
    expect(channel.isActive).toBe(true);
  });

  it('rename trims, validates and keeps slug and currency', () => {
    const channel = newChannel();
    channel.rename('  Vietnam Store ');
    expect(channel.name).toBe('Vietnam Store');
    expect(channel.slug.value).toBe('vn-store');
    expect(channel.currency).toBe('VND');
    expect(() => channel.rename('')).toThrow(InvalidValueException);
  });

  it('R2: exposes no way to change the currency', () => {
    const channel = newChannel();
    expect('changeCurrency' in channel).toBe(false);
    expect(() => {
      (channel as { currency: string }).currency = 'USD';
    }).toThrow(TypeError);
  });
});
