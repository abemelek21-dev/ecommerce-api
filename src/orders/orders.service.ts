import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CartService } from 'src/cart/cart.service';
import { Order, OrderStatus, Role } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

interface CartItem {
    productId: string;
    name: string;        // whatever your cart actually calls it
    sku?: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
}

// Valid forward transitions — admins can only move status along this map
const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
};

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private cartService: CartService
    ) { }
    // ─────────────────────────────────────────────
    // HELPER: Generate unique order number
    // e.g. ORD-20240518-A3F9
    // ─────────────────────────────────────────────
    private generateOrderNumber(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `ORD-${date}-${random}`;
    }

    // ─────────────────────────────────────────────
    // CREATE ORDER (checkout)
    // ─────────────────────────────────────────────
    async createOrder(userId: string, dto: CreateOrderDto) {
        // Delegate all validation + enrichment to CartService
        // This throws BadRequestException automatically if anything is wrong
        const { cart } = await this.cartService.validateCartForCheckout(userId);
        // Use the same numbers CartService already computed
        const { subtotal, tax, shipping, total } = cart.summary;
        // Create order with embedded shipping address
        console.log('Cart item sample:', JSON.stringify(cart.items[0], null, 2));
        const order = await this.prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    orderNumber: this.generateOrderNumber(),
                    userId,
                    paymentMethod: dto.paymentMethod,
                    shippingAddress: { ...dto.shippingAddress },
                    billingAddress: { ...(dto.billingAddress ?? dto.shippingAddress) },
                    customerNotes: dto.customerNotes,
                    subtotal,
                    tax,
                    shippingCost: shipping,
                    discount: cart.summary.totalDiscount,
                    totalAmount: total,
                    items: {
                        create: cart.items.map((item: any) => ({
                            productId: item.productId,
                            productName: item.product.name,           // ✅ nested under product
                            productSku: item.product.sku ?? 'N/A',    // ✅ nested under product
                            productImage: item.product.imageUrl ?? null, // ✅ it's imageUrl not image
                            quantity: item.quantity,
                            price: item.product.price,                // ✅ nested under product
                            total: item.itemTotal,                    // ✅ this one was already correct
                        }))
                    }
                },
                include: { items: true }
            })

            // Decrement stock 
            await Promise.all(
                cart.items.map((item: any) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    })
                ));

            // Clear cart
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return newOrder;
        })
        return order;
    }

    // ─── User: my orders ─────────────────────────────────────────────────────────
    async getMyOrders(userId: string) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    select: {
                        id: true,
                        productName: true,
                        productImage: true,
                        quantity: true,
                        price: true,
                        total: true,
                    },
                },
            },
        });
    }
    // ─── User or Admin: single order
    async getOrderById(userId: string, orderId: string, role: Role) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })
        if (!order) throw new NotFoundException('Order not found');
        // Customers can only access their own orders, admins can access all
        if (role === Role.CUSTOMER && order.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }
        return order;
    }
    // ─── Admin: list all orders
    async getAllOrders(filters: {
        status?: OrderStatus;
        page?: number;
        limit?: number;
    }) {
        const { status, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;

        const [orders, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where: status ? { status } : undefined,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { items: true },
            }),
            this.prisma.order.count({
                where: status ? { status } : undefined,
            }),
        ]);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    // ─── Admin: update order status
    async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        const allowed = VALID_TRANSITIONS[order.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new BadRequestException(
                `Cannot transition from ${order.status} to ${dto.status}. ` +
                `Allowed: ${allowed.join(', ') || 'none'}`,
            );
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: dto.status,
                ...(dto.status === OrderStatus.SHIPPED &&
                    dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
                ...(dto.adminNotes ? { adminNotes: dto.adminNotes } : {}
                ),
            },
            include: { items: true }
        });
    }
    // ─── Cancel order (user or admin)
    async cancelOrder(
        orderId: string,
        userId: string,
        role: Role,
        dto: CancelOrderDto,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) throw new NotFoundException('Order not found');

        // Ownership check for customers
        if (role === Role.CUSTOMER && order.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const cancellableByUser: OrderStatus[] = [OrderStatus.PENDING];
        const terminalStatuses: OrderStatus[] = [
            OrderStatus.DELIVERED,
            OrderStatus.REFUNDED,
            OrderStatus.CANCELLED,
        ];

        if (role === Role.CUSTOMER && !cancellableByUser.includes(order.status)) {
            throw new BadRequestException(
                'You can only cancel orders that are still pending.',
            );
        }

        if (terminalStatuses.includes(order.status)) {
            throw new BadRequestException(
                `Order is already ${order.status.toLowerCase()} and cannot be cancelled.`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            // Restore stock
            await Promise.all(
                order.items.map((item) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    }),
                ),
            );

            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.CANCELLED,
                    cancellationReason: dto.reason,
                    cancelledAt: new Date(),
                    cancelledBy: userId,
                },
                include: { items: true },
            });
        });
    }
}
