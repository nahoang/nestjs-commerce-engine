import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import {
  ApiResponse,
  PaginatedResponse,
  ok,
  paginated,
} from '../../../shared/api/envelope';
import { PaginationQueryDto } from '../../../shared/api/pagination.dto';
import { CreateListingUseCase } from '../application/create-listing.use-case';
import { GetChannelStorefrontUseCase } from '../application/get-channel-storefront.use-case';
import { CreateChannelUseCase } from '../application/create-channel.use-case';
import { GetChannelUseCase } from '../application/get-channel.use-case';
import { ListChannelsUseCase } from '../application/list-channels.use-case';
import { UpdateChannelUseCase } from '../application/update-channel.use-case';
import { CreateChannelRequest, UpdateChannelRequest } from './channel.request';
import { ChannelResponse, toChannelResponse } from './channel.response';
import { CreateListingRequest } from './listing.request';
import { ListingResponse, toListingResponse } from './listing.response';
import {
  ProductResponse,
  toStorefrontProductResponse,
} from './product.response';

const CREATE_CHANNEL_EXAMPLES = {
  A_vn_store: {
    summary: 'A. VND channel (slug generated)',
    value: { name: 'VN Store', currency: 'VND' },
  },
  B_us_store: {
    summary: 'B. USD channel with explicit slug, lower-case currency',
    value: { name: 'US Store', slug: 'us-store', currency: 'usd' },
  },
  C_invalid_currency: {
    summary: 'C. Invalid currency -> 422 on currency',
    value: { name: 'Bad', currency: 'dong' },
  },
};

const CREATE_LISTING_EXAMPLES = {
  A_channel_price: {
    summary:
      'A. List a variant (replace the id; the price is in the channel currency)',
    value: { variant_id: '<variant id>', price_amount: '250000.00' },
  },
  B_unavailable: {
    summary: 'B. Listed but not sellable -> hidden on the storefront',
    value: {
      variant_id: '<variant id>',
      price_amount: '12',
      is_available: false,
    },
  },
  C_negative_price: {
    summary: 'C. Negative price -> 422, no SQL',
    value: { variant_id: '<variant id>', price_amount: '-1' },
  },
};

const UPDATE_CHANNEL_EXAMPLES = {
  A_deactivate: {
    summary: 'A. Switch the channel off',
    value: { is_active: false },
  },
  B_currency_ignored: {
    summary: 'B. currency in the payload is ignored (R2)',
    value: { name: 'Renamed', currency: 'EUR' },
  },
};

@ApiTags('Channels')
@Controller('api/v1/channels')
export class ChannelsController {
  constructor(
    private readonly createChannelUseCase: CreateChannelUseCase,
    private readonly getChannelUseCase: GetChannelUseCase,
    private readonly listChannelsUseCase: ListChannelsUseCase,
    private readonly updateChannelUseCase: UpdateChannelUseCase,
    private readonly createListingUseCase: CreateListingUseCase,
    private readonly getChannelStorefrontUseCase: GetChannelStorefrontUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a sales channel' })
  @ApiBody({ type: CreateChannelRequest, examples: CREATE_CHANNEL_EXAMPLES })
  @SwaggerResponse({ status: 201, type: ChannelResponse })
  async create(
    @Body() body: CreateChannelRequest,
  ): Promise<ApiResponse<ChannelResponse>> {
    const channel = await this.createChannelUseCase.execute({
      name: body.name,
      slug: body.slug,
      currency: body.currency,
      isActive: body.is_active,
    });
    return ok(toChannelResponse(channel));
  }

  @Get()
  @ApiOperation({ summary: 'List channels (offset pagination)' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of channels' })
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ChannelResponse>> {
    const { items, total } = await this.listChannelsUseCase.execute(query);
    return paginated(
      items.map(toChannelResponse),
      total,
      query.limit,
      query.offset,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a channel by slug' })
  @SwaggerResponse({ status: 200, type: ChannelResponse })
  async getOne(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<ChannelResponse>> {
    return ok(toChannelResponse(await this.getChannelUseCase.execute(slug)));
  }

  @Patch(':slug')
  @ApiOperation({
    summary: 'Rename or switch a channel on/off (currency is fixed)',
  })
  @ApiBody({ type: UpdateChannelRequest, examples: UPDATE_CHANNEL_EXAMPLES })
  @SwaggerResponse({ status: 200, type: ChannelResponse })
  async update(
    @Param('slug') slug: string,
    @Body() body: UpdateChannelRequest,
  ): Promise<ApiResponse<ChannelResponse>> {
    const channel = await this.updateChannelUseCase.execute({
      slug,
      name: body.name,
      isActive: body.is_active,
    });
    return ok(toChannelResponse(channel));
  }

  @Post(':channelSlug/listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'List a variant on a channel (price in the channel currency)',
  })
  @ApiBody({ type: CreateListingRequest, examples: CREATE_LISTING_EXAMPLES })
  @SwaggerResponse({ status: 201, type: ListingResponse })
  async createListing(
    @Param('channelSlug') channelSlug: string,
    @Body() body: CreateListingRequest,
  ): Promise<ApiResponse<ListingResponse>> {
    const listing = await this.createListingUseCase.execute({
      channelSlug,
      variantId: body.variant_id,
      priceAmount: body.price_amount,
      isAvailable: body.is_available,
    });
    return ok(toListingResponse(listing));
  }

  @Get(':channelSlug/products')
  @ApiOperation({
    summary: 'Storefront of a channel: published products with channel prices',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated storefront products',
  })
  async storefront(
    @Param('channelSlug') channelSlug: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const { items, total } = await this.getChannelStorefrontUseCase.execute(
      channelSlug,
      { limit: query.limit, offset: query.offset },
    );
    return paginated(
      items.map(toStorefrontProductResponse),
      total,
      query.limit,
      query.offset,
    );
  }
}
