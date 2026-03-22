// src/auth/dto/register.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength, 
    IsOptional,
  Matches
} from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'User first name',
        example: 'John',
        minLength: 2,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: 'First name must be at least 2 characters long' })
    firstName: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
        minLength: 2,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: 'Last name must be at least 2 characters long' })
    lastName: string;

    @ApiProperty({
        description: 'User password (min 8 characters, must include uppercase, lowercase, number)',
        example: 'SecurePass123!',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
    )
    password: string;

    @ApiProperty({
        description: 'User phone number (optional)',
        example: '+251911234567',
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    phone?: string;
    @ApiPropertyOptional({
        description: 'Refresh token for maintaining user sessions',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsString()
    @IsOptional()
    refreshToken?: string;
}