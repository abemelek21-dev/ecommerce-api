// src/products/products.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // ========================================
    // CREATE PRODUCT (Admin only) with Images
    // ========================================
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @UseInterceptors(
        FileInterceptor('mainImage'),  // We'll handle multiple files differently
    )
    @HttpCode(HttpStatus.CREATED)
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new product (Admin only)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'MacBook Pro M3' },
                slug: { type: 'string', example: 'macbook-pro-m3' },
                description: { type: 'string', example: '14-inch laptop with M3 chip' },
                price: { type: 'number', example: 1999.99 },
                comparePrice: { type: 'number', example: 2299.99 },
                cost: { type: 'number', example: 1500 },
                sku: { type: 'string', example: 'LAPTOP-MBP-M3-001' },
                barcode: { type: 'string', example: '1234567890123' },
                stock: { type: 'number', example: 50 },
                lowStockThreshold: { type: 'number', example: 10 },
                weight: { type: 'number', example: 1.5 },
                dimensions: { type: 'string', example: '30x20x2 cm' },
                isActive: { type: 'boolean', example: true },
                isFeatured: { type: 'boolean', example: false },
                categoryId: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j1' },
                mainImage: { type: 'string', format: 'binary' },
                // For multiple additional images, we'll need a different endpoint
            },
            required: ['name', 'description', 'price', 'sku', 'stock', 'categoryId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    create(
        @Body() createProductDto: CreateProductDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
                ],
                fileIsRequired: false,
            }),
        )
        mainImage?: Express.Multer.File,
    ) {
        return this.productsService.create(createProductDto, mainImage);
    }

    // ========================================
    // UPLOAD ADDITIONAL IMAGES (Admin only)
    // ========================================
    @Post(':id/images')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @UseInterceptors(FilesInterceptor('images', 5))  // Max 5 additional images
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload additional product images (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    async uploadAdditionalImages(
        @Param('id') id: string,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
                ],
                fileIsRequired: true,
            }),
        )
        Images?: Express.Multer.File[],
    ) {
        return this.productsService.update(id, {}, undefined, Images);
    }

    // ========================================
    // GET ALL PRODUCTS (Public with filters)
    // ========================================
    @Public()
    @Get()
    @ApiOperation({ summary: 'Get all products with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    findAll(@Query() filters: FilterProductDto) {
        return this.productsService.findAll(filters);
    }

    // ========================================
    // GET FEATURED PRODUCTS (Public)
    // ========================================
    @Public()
    @Get('featured')
    @ApiOperation({ summary: 'Get featured products' })
    @ApiResponse({ status: 200, description: 'Featured products retrieved' })
    getFeatured() {
        return this.productsService.getFeaturedProducts();
    }

    // ========================================
    // GET LOW STOCK PRODUCTS (Admin only)
    // ========================================
    @Get('low-stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get low stock products (Admin only)' })
    @ApiResponse({ status: 200, description: 'Low stock products retrieved' })
    getLowStock() {
        return this.productsService.getLowStockProducts();
    }

    // ========================================
    // GET OUT OF STOCK PRODUCTS (Admin only)
    // ========================================
    @Get('out-of-stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get out of stock products (Admin only)' })
    @ApiResponse({ status: 200, description: 'Out of stock products retrieved' })
    getOutOfStock() {
        return this.productsService.getOutOfStockProducts();
    }

    // ========================================
    // GET PRODUCT BY ID (Public)
    // ========================================
    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product found' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    // ========================================
    // GET PRODUCT BY SLUG (Public)
    // ========================================
    @Public()
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get product by slug' })
    @ApiParam({ name: 'slug', description: 'Product slug' })
    @ApiResponse({ status: 200, description: 'Product found' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    findBySlug(@Param('slug') slug: string) {
        return this.productsService.findBySlug(slug);
    }

    // ========================================
    // GET RELATED PRODUCTS (Public)
    // ========================================
    @Public()
    @Get(':id/related')
    @ApiOperation({ summary: 'Get related products' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Related products retrieved' })
    getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
        return this.productsService.getRelatedProducts(id, limit ? +limit : 5);
    }

    // ========================================
    // UPDATE PRODUCT (Admin only)
    // ========================================
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('mainImage'))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update product (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
                ],
                fileIsRequired: false,
            }),
        )
        mainImage?: Express.Multer.File,
    ) {
        return this.productsService.update(id, updateProductDto, mainImage!);
    }

    // ========================================
    // UPDATE STOCK (Admin only)
    // ========================================
    @Patch(':id/stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product stock (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    updateStock(@Param('id') id: string, @Body() body: { quantity: number }) {
        return this.productsService.updateStock(id, body.quantity);
    }

    // ========================================
    // DELETE PRODUCT (Soft delete - Admin only)
    // ========================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete product (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 204, description: 'Product deleted successfully' })
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}