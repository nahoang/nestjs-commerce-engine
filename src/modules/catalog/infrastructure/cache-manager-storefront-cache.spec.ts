import { Test } from '@nestjs/testing';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import { StorefrontPage } from '../application/storefront-view';
import { CacheManagerStorefrontCache } from './cache-manager-storefront-cache';

const page = (total: number): StorefrontPage => ({ items: [], total });

async function build(ttlSeconds: number): Promise<CacheManagerStorefrontCache> {
  const moduleRef = await Test.createTestingModule({
    imports: [CacheModule.register()],
    providers: [
      {
        provide: AppConfigService,
        useValue: { storefrontCacheTtlSeconds: ttlSeconds },
      },
      {
        provide: CacheManagerStorefrontCache,
        useFactory: (cache: never, config: AppConfigService) =>
          new CacheManagerStorefrontCache(cache, config),
        inject: [CACHE_MANAGER, AppConfigService],
      },
    ],
  }).compile();
  return moduleRef.get(CacheManagerStorefrontCache);
}

describe('CacheManagerStorefrontCache — DOMAIN-SPEC-1-CATALOG § 1.8 R8', () => {
  it('returns a saved page, per channel and per page key', async () => {
    const cache = await build(30);
    const miss = await cache.lookup('c1', '20:0');
    expect(miss.page).toBeUndefined();
    await miss.save(page(3));

    expect((await cache.lookup('c1', '20:0')).page).toEqual(page(3));
    expect((await cache.lookup('c1', '20:20')).page).toBeUndefined();
    expect((await cache.lookup('c2', '20:0')).page).toBeUndefined();
  });

  it('invalidating a channel drops its pages only', async () => {
    const cache = await build(30);
    await (await cache.lookup('c1', 'p')).save(page(1));
    await (await cache.lookup('c2', 'p')).save(page(2));

    await cache.invalidateChannel('c1');

    expect((await cache.lookup('c1', 'p')).page).toBeUndefined();
    expect((await cache.lookup('c2', 'p')).page).toEqual(page(2));
  });

  it('a page loaded before an invalidation cannot be served after it', async () => {
    const cache = await build(30);
    const lookup = await cache.lookup('c1', 'p'); // reader starts, finds a miss
    await cache.invalidateChannel('c1'); // writer commits and invalidates
    await lookup.save(page(99)); // reader finishes with data read before the write

    expect((await cache.lookup('c1', 'p')).page).toBeUndefined();
  });

  it('a TTL of 0 disables the cache', async () => {
    const cache = await build(0);
    const lookup = await cache.lookup('c1', 'p');
    await lookup.save(page(1));
    expect((await cache.lookup('c1', 'p')).page).toBeUndefined();
    await expect(cache.invalidateChannel('c1')).resolves.toBeUndefined();
  });
});
