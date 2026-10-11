import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import { CartSettings } from '../application/cart-settings';

@Injectable()
export class ConfigCartSettings implements CartSettings {
  constructor(private readonly config: AppConfigService) {}

  get maxLineQuantity(): number {
    return this.config.cartLineMaxQuantity;
  }
}

