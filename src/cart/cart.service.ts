import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

interface InvalidItems {
    productName: string;
    reason: string;
}

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }


    async getOrCreateCart(userId: string) {
        let cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                price: true,
                                comparePrice: true,
                                imageUrl: true,
                                stock: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        })

        // create cart if doen't exists
        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    price: true,
                                    comparePrice: true,
                                    imageUrl: true,
                                    stock: true,
                                    isActive: true,
                                },
                            },
                        },
                    },
                },
            });
        }
        return this.enrichCartData(cart)
    }


    /**
    * ADD ITEM TO CART
    */
    async addToCart(userId: string, addToCartDto: AddToCartDto) {
        const { productId, quantity } = addToCartDto;

        // Validate product exists and is active
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (!product.isActive) {
            throw new BadRequestException('Product is not available');
        }

        // Check stock availability
        if (product.stock < quantity) {
            throw new BadRequestException(
                `Only ${product.stock} units available in stock`,
            );
        }

        // Get or create cart
        const cart = await this.getOrCreateCart(userId);

        // Check if product already in cart
        const existingItem = cart.items.find(
            (item: { productId: string; }) => item.productId === productId,
        );

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + quantity;

            // Validate total quantity
            if (newQuantity > product.stock) {
                throw new BadRequestException(
                    `Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} units available`,
                );
            }

            await this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity },
            });
        } else {
            // Add new item
            await this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId,
                    quantity,
                },
            });
        }

        // Return updated cart
        return this.getOrCreateCart(userId);
    }

    /**
   * UPDATE CART ITEM QUANTITY
   */
    async updateCartItem(
        userId: string,
        itemId: string,
        updateCartItemDto: UpdateCartItemDto,
    ) {
        const { quantity } = updateCartItemDto;

        // Get cart item
        const cartItem = await this.prisma.cartItem.findUnique({
            where: { id: itemId },
            include: {
                cart: true,
                product: true,
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        // Verify cart belongs to user
        if (cartItem.cart.userId !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        // Check stock availability
        if (quantity > cartItem.product.stock) {
            throw new BadRequestException(
                `Only ${cartItem.product.stock} units available`,
            );
        }

        // Update quantity
        await this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });

        return this.getOrCreateCart(userId);
    }

    /**
     * REMOVE ITEM FROM CART
     */
    async removeFromCart(userId: string, itemId: string) {
        const cartItem = await this.prisma.cartItem.findUnique({
            where: { id: itemId },
            include: {
                cart: true,
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        // Verify cart belongs to user
        if (cartItem.cart.userId !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        await this.prisma.cartItem.delete({
            where: { id: itemId },
        });

        return this.getOrCreateCart(userId);
    }

    /**
     * CLEAR ENTIRE CART
     */
    async clearCart(userId: string) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
        });

        if (cart) {
            await this.prisma.cartItem.deleteMany({
                where: { cartId: cart.id },
            });
        }

        return this.getOrCreateCart(userId);
    }

    /**
     * VALIDATE CART FOR CHECKOUT
     */
    async validateCartForCheckout(userId: string) {
        const cart = await this.getOrCreateCart(userId);

        if (cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        const invalidItems: InvalidItems[] = [];
        
        for (const item of cart.items) {
            // Check if product still exists and is active
            if (!item.product.isActive) {
                invalidItems.push({
                    productName: item,
                    reason: 'Product is no longer available',
                });
                continue;
            }

            // // Check stock availability
            if (item.product.stock < item.quantity) {
                invalidItems.push({
                    productName: item.product.name,
                    reason: `Only ${item.product.stock} units available (you have ${item.quantity} in cart)`,
                });
            }
            
        }

        if (invalidItems.length > 0) {
            throw new BadRequestException({
                message: 'Some items in your cart are invalid',
                invalidItems,
            });
        }

        return { valid: true, cart };
    }
    /**
   * HELPER: Enrich cart with calculated totals
   */
    private enrichCartData(cart: any) {
        const items = cart.items.map((item: { product: { price: number; comparePrice: number; }; quantity: number; }) => {
            const itemTotal = item.product.price * item.quantity;
            const discount = item.product.comparePrice
                ? (item.product.comparePrice - item.product.price) * item.quantity
                : 0;

            return {
                ...item,
                itemTotal,
                discount,
            };
        });

        const subtotal = items.reduce((sum: any, item: { itemTotal: any; }) => sum + item.itemTotal, 0);
        const totalDiscount = items.reduce((sum: any, item: { discount: any; }) => sum + item.discount, 0);
        const tax = subtotal * 0.15; // 15% tax (adjust as needed)
        const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
        const total = subtotal + tax + shipping;

        return {
            ...cart,
            items,
            summary: {
                subtotal,
                totalDiscount,
                tax,
                shipping,
                total,
                itemCount: items.reduce((sum: any, item: { quantity: any; }) => sum + item.quantity, 0),
            },
        };
    }
}
