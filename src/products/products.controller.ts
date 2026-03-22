import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Role } from '@prisma/client';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FilterProductDto } from './dto/filter-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('products')
export class ProductsController {
    constructor(private productsService: ProductsService) { }

    // ========================================
    // CREATE PRODUCT (Admin only)
    // ========================================
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new product (Admin only)' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 409, description: 'SKU or slug already exists' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
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
    // GET LOW STOCK PRODUCTS (Admin only)
    // ========================================
    @Get('low-stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)

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

    @ApiOperation({ summary: 'Update product (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    // ========================================
    // UPDATE STOCK (Admin only)
    // ========================================
    @Patch(':id/stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)

    @ApiOperation({ summary: 'Update product stock (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    updateStock(
        @Param('id') id: string,
        @Body() body: { quantity: number }
    ) {
        return this.productsService.updateStock(id, body.quantity);
    }

    // ========================================
    // DELETE PRODUCT (Soft delete - Admin only)
    // ========================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product (Admin only)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 204, description: 'Product deleted successfully' })
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
