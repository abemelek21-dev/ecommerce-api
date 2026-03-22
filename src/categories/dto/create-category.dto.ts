import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    MinLength,
    IsOptional,
} from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'Category name',
        example: 'Electronics',
        minLength: 2,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @ApiPropertyOptional({
        description: 'URL-friendly slug (auto-generated if not provided)',
        example: 'electronics',
    })
    @IsString()
    @IsOptional()
    slug?: string;

    @ApiPropertyOptional({
        description: 'Category description',
        example: 'All electronic devices and accessories',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        description: 'Parent category ID (for subcategories)',
        example: '65f1a2b3c4d5e6f7g8h9i0j1',
    })
    @IsString()
    @IsOptional()
    parentId?: string;

}