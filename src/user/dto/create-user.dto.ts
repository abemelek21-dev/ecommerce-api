// src/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    IsOptional,
    IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'User first name',
        example: 'John',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    firstName: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    lastName: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecurePass123!',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({
        description: 'User phone number',
        example: '+251911234567',
    })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({
        description: 'User role',
        enum: Role,
        default: Role.CUSTOMER,
    })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @ApiPropertyOptional({
        description: 'Refresh token for maintaining user sessions',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsString()
    @IsOptional()
    refreshToken?: string;
}