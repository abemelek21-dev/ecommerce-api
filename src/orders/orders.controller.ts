// src/orders/orders.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Role, OrderStatus } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // ─── Customer: place an order ─────────────────────────────────────────────

    @Post()
    @ApiOperation({ summary: 'Create order from cart (checkout)' })
    @ApiResponse({ status: 201, description: 'Order placed successfully' })
    @ApiResponse({ status: 400, description: 'Cart empty or stock issues' })
    create(
        @CurrentUser('userId') userId: string,
        @Body() dto: CreateOrderDto,
    ) {
        return this.ordersService.createOrder(userId, dto);
    }

    // ─── Customer: my orders ──────────────────────────────────────────────────

    @Get('my')
    @ApiOperation({ summary: 'Get current user order history' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    getMyOrders(@CurrentUser('userId') userId: string) {
        return this.ordersService.getMyOrders(userId);
    }

    // ─── Admin: all orders (paginated, filterable) ────────────────────────────

    @Get()
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all orders (Admin only)' })
    @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
    @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
    @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    getAllOrders(
        @Query('status') status?: OrderStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.ordersService.getAllOrders({ status, page, limit });
    }

    // ─── Customer or Admin: single order ─────────────────────────────────────

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    getOne(
        @CurrentUser('userId') userId: string,
        @CurrentUser('role') role: Role,
        @Param('id') id: string,
    ) {
        return this.ordersService.getOrderById(userId, id, role);
    }

    // ─── Admin: update order status ───────────────────────────────────────────

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update order status (Admin only)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateOrderStatus(id, dto);
    }

    // ─── Customer or Admin: cancel order ─────────────────────────────────────

    @Patch(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel an order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order cancelled, stock restored' })
    @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    cancel(
        @CurrentUser('userId') userId: string,
        @CurrentUser('role') role: Role,
        @Param('id') id: string,
        @Body() dto: CancelOrderDto,
    ) {
        return this.ordersService.cancelOrder(id, userId, role, dto);
    }
}