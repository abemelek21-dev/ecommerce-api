// src/products/products.service.ts
import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto, SortBy, SortOrder } from './dto/filter-product.dto';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    /**
     * CREATE PRODUCT
     * Business logic:
     * - Generate slug from name if not provided
     * - Check SKU uniqueness
     * - Check slug uniqueness
     * - Validate category exists
     * - Set default values
     */
    async create(createProductDto: CreateProductDto) {
        // Generate slug if not provided
        const slug = createProductDto.slug ?
            createProductDto.slug : this.generateSlug(createProductDto.name);

        // Check if SKU already exists
        const existingSku = await this.prisma.product.findUnique({
            where: { sku: createProductDto.sku },
        });
        if (existingSku) {
            throw new ConflictException(`Product with SKU "${createProductDto.sku}" already exists`);
        }

        // Check if slug already exists
        const existingSlug = await this.prisma.product.findUnique({
            where: { slug: createProductDto.slug },
        });
        if (existingSlug) {
            throw new ConflictException(`Product with slug "${createProductDto.slug}" already exists`);
        }

        // Validate category exists
        const categoryExists = await this.prisma.category.findUnique({
            where: { id: createProductDto.categoryId },
        });
        if (!categoryExists) {
            throw new NotFoundException(`Category with ID "${createProductDto.categoryId}" not found`);
        }

        // Validate price logic
        if (createProductDto.comparePrice && createProductDto.comparePrice < createProductDto.price) {
            throw new BadRequestException('Compare price must be greater than selling price');
        }

        // Create product
        const product = await this.prisma.product.create({
            data: {
                name: createProductDto.name,
                slug,                                               // ✅ now definitely a string
                description: createProductDto.description,
                price: createProductDto.price,
                comparePrice: createProductDto.comparePrice,
                cost: createProductDto.cost,
                sku: createProductDto.sku,
                stock: createProductDto.stock,
                images: createProductDto.images ?? [],
                isActive: createProductDto.isActive ?? true,
                isFeatured: createProductDto.isFeatured ?? false,
                lowStockThreshold: createProductDto.lowStockThreshold ?? 10,
                categoryId: createProductDto.categoryId,
            },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        return this.enrichProductData(product);
    }

    /**
     * GET ALL PRODUCTS WITH FILTERS
     * Business logic:
     * - Search by name/description
     * - Filter by category, price range, stock status
     * - Sort by multiple fields
     * - Pagination
     */
    async findAll(filters: FilterProductDto) {
        const {
            search,
            categoryId,
            minPrice,
            maxPrice,
            isActive,
            isFeatured,
            inStock,
            lowStock,
            sortBy = SortBy.CREATED_AT,
            sortOrder = SortOrder.DESC,
            page = 1,
            limit = 10,
        } = filters;

        // Build where clause
        const where: any = {};

        // Search
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Category filter
        if (categoryId) {
            where.categoryId = categoryId;
        }

        // Price range filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined) where.price.gte = minPrice;
            if (maxPrice !== undefined) where.price.lte = maxPrice;
        }

        // Active filter
        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        // Featured filter
        if (isFeatured !== undefined) {
            where.isFeatured = isFeatured;
        }

        // Stock filters
        if (inStock) {
            where.stock = { gt: 0 };
        }

        if (lowStock) {
            where.AND = [
                { stock: { gt: 0 } },
                { stock: { lte: this.prisma.product.fields.lowStockThreshold } },
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build orderBy
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        // Get total count
        const total = await this.prisma.product.count({ where });

        // Get products
        const products = await this.prisma.product.findMany({
            where,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                _count: {
                    select: {
                        reviews: true,
                    },
                },
            },
            orderBy,
            skip,
            take: limit,
        });

        // Enrich product data
        const enrichedProducts = products.map(product => this.enrichProductData(product));

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);

        return {
            data: enrichedProducts,
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    }

    /**
     * GET PRODUCT BY ID
     */
    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                },
                _count: {
                    select: {
                        reviews: true,
                        orderItems: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        return this.enrichProductData(product);
    }

    /**
     * GET PRODUCT BY SLUG
     */
    async findBySlug(slug: string) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            include: {
                category: true,
                reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                },
                _count: {
                    select: {
                        reviews: true,
                        orderItems: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException(`Product with slug "${slug}" not found`);
        }

        return this.enrichProductData(product);
    }

    /**
     * UPDATE PRODUCT
     * Business logic:
     * - Check if product exists
     * - Validate SKU/slug uniqueness if changed
     * - Validate price logic
     */
    async update(id: string, updateProductDto: UpdateProductDto) {
        // Check if product exists
        const existingProduct = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        // Check SKU uniqueness if changed
        if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
            const skuExists = await this.prisma.product.findUnique({
                where: { sku: updateProductDto.sku },
            });
            if (skuExists) {
                throw new ConflictException(`Product with SKU "${updateProductDto.sku}" already exists`);
            }
        }

        // Check slug uniqueness if changed
        if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
            const slugExists = await this.prisma.product.findUnique({
                where: { slug: updateProductDto.slug },
            });
            if (slugExists) {
                throw new ConflictException(`Product with slug "${updateProductDto.slug}" already exists`);
            }
        }

        // Validate category if changed
        if (updateProductDto.categoryId) {
            const categoryExists = await this.prisma.category.findUnique({
                where: { id: updateProductDto.categoryId },
            });
            if (!categoryExists) {
                throw new NotFoundException(`Category with ID "${updateProductDto.categoryId}" not found`);
            }
        }

        // Validate price logic
        const finalPrice = updateProductDto.price ?? existingProduct.price;
        const finalComparePrice = updateProductDto.comparePrice ?? existingProduct.comparePrice;

        if (finalComparePrice && finalComparePrice < finalPrice) {
            throw new BadRequestException('Compare price must be greater than selling price');
        }

        // Update product
        const product = await this.prisma.product.update({
            where: { id },
            data: updateProductDto,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        return this.enrichProductData(product);
    }

    /**
     * DELETE PRODUCT (Soft delete - mark as inactive)
     */
    async remove(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        // Soft delete (mark as inactive)
        await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: 'Product deleted successfully' };
    }

    /**
     * HARD DELETE PRODUCT
     */
    async hardRemove(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        await this.prisma.product.delete({
            where: { id },
        });

        return { message: 'Product permanently deleted' };
    }

    /**
     * UPDATE STOCK
     * Business logic:
     * - Increase or decrease stock
     * - Prevent negative stock
     */
    async updateStock(id: string, quantity: number) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        const newStock = product.stock + quantity;

        if (newStock < 0) {
            throw new BadRequestException('Insufficient stock');
        }

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: { stock: newStock },
        });

        return this.enrichProductData(updatedProduct);
    }

    /**
     * CHECK STOCK AVAILABILITY
     */
    async checkStock(id: string, quantity: number): Promise<boolean> {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        return product.stock >= quantity;
    }

    /**
     * GET LOW STOCK PRODUCTS
     */
    async getLowStockProducts() {
        const products = await this.prisma.product.findMany({
            where: {
                AND: [
                    { stock: { gt: 0 } },
                    {
                        stock: {
                            lte: this.prisma.product.fields.lowStockThreshold
                        }
                    },
                ],
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                stock: 'asc',
            },
        });

        return products.map(product => this.enrichProductData(product));
    }

    /**
     * GET OUT OF STOCK PRODUCTS
     */
    async getOutOfStockProducts() {
        const products = await this.prisma.product.findMany({
            where: {
                stock: 0,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return products.map(product => this.enrichProductData(product));
    }

    /**
     * GET FEATURED PRODUCTS
     */
    async getFeaturedProducts() {
        const products = await this.prisma.product.findMany({
            where: {
                isFeatured: true,
                isActive: true,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });

        return products.map(product => this.enrichProductData(product));
    }

    /**
     * GET RELATED PRODUCTS (same category)
     */
    async getRelatedProducts(id: string, limit: number = 5) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        const relatedProducts = await this.prisma.product.findMany({
            where: {
                categoryId: product.categoryId,
                id: { not: id },
                isActive: true,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            take: limit,
        });

        return relatedProducts.map(p => this.enrichProductData(p));
    }

    /**
     * BULK UPDATE STOCK (for orders)
     */
    async bulkUpdateStock(updates: { productId: string; quantity: number }[]) {
        const results:Awaited<ReturnType<typeof this.updateStock>>[] = [];

        for (const update of updates) {
            const product = await this.updateStock(update.productId, -update.quantity);
            results.push(product);
        }

        return results;
    }

    /**
     * GENERATE SLUG FROM NAME
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    /**
     * ENRICH PRODUCT DATA WITH COMPUTED FIELDS
     */
    private enrichProductData(product: any) {
        const enriched: any = { ...product };

        // Calculate discount percentage
        if (product.comparePrice && product.comparePrice > product.price) {
            enriched.discountPercentage = Math.round(
                ((product.comparePrice - product.price) / product.comparePrice) * 100
            );
        }

        // Calculate profit margin
        if (product.cost) {
            enriched.profitMargin = Math.round(
                ((product.price - product.cost) / product.price) * 100
            );
        }

        // Stock status
        enriched.isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
        enriched.isOutOfStock = product.stock === 0;

        // Average rating (if reviews included)
        if (product.reviews && product.reviews.length > 0) {
            const totalRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
            enriched.averageRating = (totalRating / product.reviews.length).toFixed(1);
        }

        return enriched;
    }
}