import { JwtService } from '@nestjs/jwt';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import { Email } from '../domain/email';
import { User } from '../domain/user.entity';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const secret = 'unit-test-secret-at-least-32-characters-long';
  const jwt = new JwtService({ secret });
  const config = { accessTokenExpireMinutes: 30 } as AppConfigService;
  const service = new JwtTokenService(jwt, config);
  const user = new User({
    email: Email.create('lan@example.com'),
    passwordHash: '$argon2id$stub',
    firstName: 'Lan',
    lastName: 'Nguyen',
    tokenKey: 'a'.repeat(64),
  });

  it('issues a token carrying sub, tkey and exp (R3) and verifies it', async () => {
    const issued = await service.issue(user);

    expect(issued.expiresIn).toBe(1800);
    const payload = jwt.decode<{
      sub: string;
      tkey: string;
      exp: number;
      iat: number;
    }>(issued.accessToken);
    expect(payload.sub).toBe(user.id);
    expect(payload.tkey).toBe(user.tokenKey);
    expect(payload.exp - payload.iat).toBe(1800);
    await expect(service.verify(issued.accessToken)).resolves.toEqual({
      sub: user.id,
      tkey: user.tokenKey,
    });
  });

  it('rejects garbage, a foreign signature, and a token without the expected claims', async () => {
    const foreign = await new JwtService({
      secret: 'another-secret',
    }).signAsync({
      sub: user.id,
      tkey: user.tokenKey,
    });
    const noClaims = await jwt.signAsync({ hello: 'world' });

    for (const token of ['', 'abc', foreign, noClaims]) {
      await expect(service.verify(token)).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    }
  });
});
