// src/users/users.controller.ts
import {
    Controller,
    Get,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    findAll() {
        return this.userService.findAll();
    }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    getMe(@CurrentUser('userId') userId: string) {
        return this.userService.findOne(userId);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get user by ID (Admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    updateMe(
        @CurrentUser('userId') userId: string,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        return this.userService.update(userId, updateUserDto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update user (Admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate user (Admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 204, description: 'User deactivated successfully' })
    remove(@Param('id') id: string) {
        return this.userService.remove(id);
    }

    @Patch(':id/activate')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Activate user (Admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User activated successfully' })
    activate(@Param('id') id: string) {
        return this.userService.activate(id);
    }
}