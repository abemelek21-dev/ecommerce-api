// src/orders/dto/update-order-status.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
    @ApiProperty({
        description: 'New order status',
        enum: OrderStatus,
    })
    @IsEnum(OrderStatus)
    status!: OrderStatus;

    @ApiPropertyOptional({
        description: 'Tracking number (for SHIPPED status)',
        example: 'ETH123456789',
    })
    @IsString()
    @IsOptional()
    trackingNumber?: string;

    @ApiPropertyOptional({
        description: 'Admin notes',
        example: 'Packed and ready for pickup',
    })
    @IsString()
    @IsOptional()
    adminNotes?: string;
}