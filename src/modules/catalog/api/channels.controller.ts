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
import { CreateChannelUseCase } from '../application/create-channel.use-case';
import { GetChannelUseCase } from '../application/get-channel.use-case';
import { ListChannelsUseCase } from '../application/list-channels.use-case';
import { UpdateChannelUseCase } from '../application/update-channel.use-case';
import { CreateChannelRequest, UpdateChannelRequest } from './channel.request';
import { ChannelResponse, toChannelResponse } from './channel.response';

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
}
