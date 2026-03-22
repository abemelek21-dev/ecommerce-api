import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsInt,
    IsBoolean,
    IsArray,
    IsUrl,
    Min,
    MinLength
} from "class-validator";
export class CreateProductDto {
    @ApiProperty({
        description: 'Product name',
        example: 'MacBook Pro M3',
        minLength: 3,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @ApiProperty({
        description: 'URL-friendly slug (auto-generated if not provided)',
        example: 'macbook-pro-m3',
        required: false,
    })
    @IsString()
    @IsOptional()
    slug?: string;

    @ApiProperty({
        description: 'Product description',
        example: '14-inch laptop with M3 chip, 16GB RAM, 512GB SSD',
        minLength: 10,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    description: string;

    @ApiProperty({
        description: 'Selling price',
        example: 1999.99,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({
        description: 'Original price (for showing discounts)',
        example: 2299.99,
    })
    @IsNumber()
    @IsOptional()
    @Min(0)
    comparePrice?: number;

    @ApiPropertyOptional({
        description: 'Cost price (for profit calculation)',
        example: 1500.00,
    })
    @IsNumber()
    @IsOptional()
    @Min(0)
    cost?: number;

    @ApiProperty({
        description: 'Stock Keeping Unit (SKU)',
        example: 'LAPTOP-MBP-M3-001',
    })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiPropertyOptional({
        description: 'Barcode',
        example: '1234567890123',
    })
    @IsString()
    @IsOptional()
    barcode?: string;

    @ApiProperty({
        description: 'Available stock quantity',
        example: 50,
        minimum: 0,
    })
    @IsInt()
    @Min(0)
    stock: number;

    @ApiPropertyOptional({
        description: 'Low stock alert threshold',
        example: 10,
        default: 10,
    })
    @IsInt()
    @IsOptional()
    @Min(0)
    lowStockThreshold?: number;

    @ApiPropertyOptional({
        description: 'Weight in kg',
        example: 1.5,
    })
    @IsNumber()
    @IsOptional()
    @Min(0)
    weight?: number;

    @ApiPropertyOptional({
        description: 'Dimensions (L x W x H)',
        example: '30x20x2 cm',
    })
    @IsString()
    @IsOptional()
    dimensions?: string;

    @ApiPropertyOptional({
        description: 'Main product image URL',
        example: 'https://example.com/images/macbook-pro-m3.jpg',
    })
    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Additional product images',
        example: [
            'https://example.com/images/macbook-1.jpg',
            'https://example.com/images/macbook-2.jpg'
        ],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @ApiPropertyOptional({
        description: 'Is product active and visible',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Is product featured on homepage',
        example: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @ApiProperty({
        description: 'Category ID',
        example: '65f1a2b3c4d5e6f7g8h9i0j1',
    })
    @IsString()
    @IsNotEmpty()
    categoryId: string;
}