import { ChannelListing } from '../domain/channel-listing.entity';

/** DI token and contract for ChannelListing persistence (no ORM types). */
export abstract class ChannelListingRepository {
  /** Inserts a listing. Same (variant, channel) twice -> DuplicateEntityException (R1). */
  abstract save(listing: ChannelListing): Promise<void>;
  /** Ids of the channels where any variant of the product is listed. */
  abstract findChannelIdsByProductId(productId: string): Promise<string[]>;
}
