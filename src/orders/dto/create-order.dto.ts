// src/orders/dto/create-order.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    ValidateNested,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

// Address embedded in order
class ShippingAddressDto {
    @ApiProperty({ example: 'Abebe Kebede' })
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @ApiProperty({ example: '+251911234567' })
    @IsString()
    @IsNotEmpty()
    phone!: string;

    @ApiProperty({ example: 'Bole Road, House #123' })
    @IsString()
    @IsNotEmpty()
    addressLine1!: string;

    @ApiPropertyOptional({ example: 'Near Edna Mall' })
    @IsString()
    @IsOptional()
    addressLine2?: string;

    @ApiProperty({ example: 'Addis Ababa' })
    @IsString()
    @IsNotEmpty()
    city!: string;

    @ApiPropertyOptional({ example: 'Addis Ababa' })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiProperty({ example: 'Ethiopia' })
    @IsString()
    @IsNotEmpty()
    country!: string;

    @ApiPropertyOptional({ example: '1000' })
    @IsString()
    @IsOptional()
    zipCode?: string;
}

export class CreateOrderDto {
    @ApiProperty({
        description: 'Payment method',
        enum: PaymentMethod,
        example: PaymentMethod.CHAPA,
    })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod!: PaymentMethod;

    @ApiProperty({
        description: 'Shipping address',
        type: ShippingAddressDto,
    })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    @IsObject()
    shippingAddress!: ShippingAddressDto;

    @ApiPropertyOptional({
        description: 'Billing address (if different from shipping)',
        type: ShippingAddressDto,
    })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    @IsOptional()
    billingAddress?: ShippingAddressDto;

    @ApiPropertyOptional({
        description: 'Customer notes',
        example: 'Please call before delivery',
    })
    @IsString()
    @IsOptional()
    customerNotes?: string;
}