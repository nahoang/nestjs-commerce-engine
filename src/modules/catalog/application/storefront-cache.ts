import { StorefrontPage } from './storefront-view';

/** Result of a cache lookup; `save` stores a freshly loaded page under the same generation. */
export interface StorefrontCacheLookup {
  page: StorefrontPage | undefined;
  save(page: StorefrontPage): Promise<void>;
}

/**
 * Port for the per-channel storefront cache (R8). Abstract class = DI token.
 * Callers look up first, load on a miss, then `save` through the lookup: a page loaded
 * before an invalidation is then stored under the old generation and is never read again.
 */
export abstract class StorefrontCache {
  abstract lookup(
    channelId: string,
    pageKey: string,
  ): Promise<StorefrontCacheLookup>;

  /** Drops every cached page of the channel; the next request reads fresh data. */
  abstract invalidateChannel(channelId: string): Promise<void>;
}
