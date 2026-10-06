import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import {
  StorefrontCache,
  StorefrontCacheLookup,
} from '../application/storefront-cache';
import { StorefrontPage } from '../application/storefront-view';

/**
 * StorefrontCache on top of the Nest cache manager.
 *
 * Invalidation uses a per-channel "generation" token stored in the cache itself: pages
 * are cached under `storefront:<channel>:<generation>:<page>`, and invalidating replaces
 * the generation with a new random one, so old pages are simply never read again and
 * expire by TTL. This needs no key scan, and a request that read the database before an
 * invalidation saves its page under the old generation, so it cannot serve stale data.
 *
 * The default store is IN MEMORY and local to one process: with several instances an
 * invalidation on one instance would not reach the others. Production with more than
 * one instance needs a shared store (Redis) behind the same CACHE_MANAGER.
 */
@Injectable()
export class CacheManagerStorefrontCache extends StorefrontCache {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  private get ttlMs(): number {
    return this.config.storefrontCacheTtlSeconds * 1000;
  }

  private generationKey(channelId: string): string {
    return `storefront:generation:${channelId}`;
  }

  async lookup(
    channelId: string,
    pageKey: string,
  ): Promise<StorefrontCacheLookup> {
    if (this.ttlMs <= 0) {
      return { page: undefined, save: () => Promise.resolve() };
    }
    // Read the generation BEFORE the caller reads the database
    const generation =
      (await this.cache.get<string>(this.generationKey(channelId))) ?? '0';
    const key = `storefront:${channelId}:${generation}:${pageKey}`;
    const page = await this.cache.get<StorefrontPage>(key);
    return {
      page: page ?? undefined,
      save: async (loaded) => {
        await this.cache.set(key, loaded, this.ttlMs);
      },
    };
  }

  async invalidateChannel(channelId: string): Promise<void> {
    if (this.ttlMs <= 0) {
      return;
    }
    // The generation outlives every page it protects (pages live at most one TTL)
    await this.cache.set(
      this.generationKey(channelId),
      crypto.randomUUID(),
      this.ttlMs * 2,
    );
  }
}
