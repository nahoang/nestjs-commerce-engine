import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantTestDto {
  @IsString()
  @IsNotEmpty({ message: 'sku should not be empty' })
  sku!: string;

  @IsNumber({}, { message: 'price must be a number' })
  price!: number;
}

export class CreateProductTestDto {
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantTestDto)
  variants!: VariantTestDto[];
}
