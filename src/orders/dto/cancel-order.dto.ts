// src/orders/dto/cancel-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Changed my mind',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}