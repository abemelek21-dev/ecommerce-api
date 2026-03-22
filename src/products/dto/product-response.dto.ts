// src/products/dto/product-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  comparePrice?: number;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  categoryId: string;

  @ApiProperty({ required: false })
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Computed fields
  @ApiProperty({ description: 'Discount percentage if comparePrice exists' })
  discountPercentage?: number;

  @ApiProperty({ description: 'Profit margin if cost exists' })
  profitMargin?: number;

  @ApiProperty({ description: 'Is stock low' })
  isLowStock: boolean;

  @ApiProperty({ description: 'Is out of stock' })
  isOutOfStock: boolean;
}

export class PaginatedProductResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;
}