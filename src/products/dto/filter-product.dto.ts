// src/products/dto/filter-product.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsString, 
  IsNumber, 
  IsBoolean, 
  Min, 
  IsInt,
  IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  NAME = 'name',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  STOCK = 'stock',
}

export class FilterProductDto {
  @ApiPropertyOptional({
    description: 'Search by product name or description',
    example: 'macbook',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: '65f1a2b3c4d5e6f7g8h9i0j1',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Show only active products',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Show only featured products',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Show only products with stock',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Show only low stock products',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: SortBy,
    example: SortBy.CREATED_AT,
    default: SortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}