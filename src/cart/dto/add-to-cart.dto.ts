import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class AddToCartDto {
    @ApiProperty({
        description: 'Product ID',
        example: '65f1a2b3c4d5e6f7g8h9i0j1'
    })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Quantity to add',
        example: 2,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    quantity: number;
}