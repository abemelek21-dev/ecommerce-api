// src/categories/categories.service.ts
import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    /**
     * CREATE CATEGORY
     */
    async create(createCategoryDto: CreateCategoryDto, image?: Express.Multer.File) {
        // Generate slug if not provided
        const slug = createCategoryDto.slug ?
            createCategoryDto.slug : this.generateSlug(createCategoryDto.name)

        // Check if slug already exists
        const existingSlug = await this.prisma.category.findUnique({
            where: { slug },
        });

        if (existingSlug) {
            throw new ConflictException(`Category with slug "${createCategoryDto.slug}" already exists`);
        }

        // Check if name already exists
        const existingName = await this.prisma.category.findUnique({
            where: { name: createCategoryDto.name },
        });

        if (existingName) {
            throw new ConflictException(`Category "${createCategoryDto.name}" already exists`);
        }

        // Validate parent category if provided
        if (createCategoryDto.parentId) {
            const parentExists = await this.prisma.category.findUnique({
                where: { id: createCategoryDto.parentId },
            });

            if (!parentExists) {
                throw new NotFoundException(`Parent category not found`);
            }
        }

        // Upload image to Cloudinary if provided
        let imageUrl: string | undefined;
        if (image) {
            const uploadResult = await this.cloudinary.uploadImage(image, 'categories');
            imageUrl = uploadResult.secure_url;
        }

        // Create category
        const category = await this.prisma.category.create({
            data: {
                slug,
                name:createCategoryDto.name,
                description:createCategoryDto.description,
                parentId:createCategoryDto.parentId,
                imageUrl
            },
            include: {
                parent: true,
                children: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        return category;
    }

    /**
     * GET ALL CATEGORIES (Tree structure)
     */
    async findAll() {
        const categories = await this.prisma.category.findMany({
            include: {
                parent: true,
                children: {
                    include: {
                        children: true,
                        _count: {
                            select: {
                                products: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return categories;
    }

    /**
     * GET ROOT CATEGORIES (no parent)
     */
    async findRootCategories() {
        const categories = await this.prisma.category.findMany({
            where: {
                parentId: null,
            },
            include: {
                children: {
                    include: {
                        _count: {
                            select: {
                                products: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return categories;
    }

    /**
     * GET CATEGORY BY ID
     */
    async findOne(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                parent: true,
                children: {
                    include: {
                        _count: {
                            select: {
                                products: true,
                            },
                        },
                    },
                },
                products: {
                    where: {
                        isActive: true,
                    },
                    take: 10,
                },
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        if (!category) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }

        return category;
    }

    /**
     * GET CATEGORY BY SLUG
     */
    async findBySlug(slug: string) {
        const category = await this.prisma.category.findUnique({
            where: { slug },
            include: {
                parent: true,
                children: {
                    include: {
                        _count: {
                            select: {
                                products: true,
                            },
                        },
                    },
                },
                products: {
                    where: {
                        isActive: true,
                    },
                    take: 10,
                },
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        if (!category) {
            throw new NotFoundException(`Category with slug "${slug}" not found`);
        }

        return category;
    }

    /**
     * UPDATE CATEGORY
     */
    async update(
        id: string,
        updateCategoryDto: UpdateCategoryDto,
        image?: Express.Multer.File,
    ) {
        const category = await this.prisma.category.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }

        // Check slug uniqueness if changed
        if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
            const slugExists = await this.prisma.category.findUnique({
                where: { slug: updateCategoryDto.slug },
            });

            if (slugExists) {
                throw new ConflictException(`Category with slug "${updateCategoryDto.slug}" already exists`);
            }
        }

        // Check name uniqueness if changed
        if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
            const nameExists = await this.prisma.category.findUnique({
                where: { name: updateCategoryDto.name },
            });

            if (nameExists) {
                throw new ConflictException(`Category "${updateCategoryDto.name}" already exists`);
            }
        }

        // Prevent circular reference
        if (updateCategoryDto.parentId) {
            if (updateCategoryDto.parentId === id) {
                throw new BadRequestException('Category cannot be its own parent');
            }

            // Check if new parent exists
            const parentExists = await this.prisma.category.findUnique({
                where: { id: updateCategoryDto.parentId },
            });

            if (!parentExists) {
                throw new NotFoundException('Parent category not found');
            }
        }

        // Upload new image if provided (delete old one)
        let imageUrl = category.imageUrl;
        if (image) {
            // Delete old image from Cloudinary if exists
            if (category.imageUrl) {
                const publicId = this.extractPublicId(category.imageUrl);
                await this.cloudinary.deleteImage(publicId);
            }

            const uploadResult = await this.cloudinary.uploadImage(image, 'categories');
            imageUrl = uploadResult.secure_url;
        }

        const updatedCategory = await this.prisma.category.update({
            where: { id },
            data: {
                ...updateCategoryDto,
                imageUrl,
            },
            include: {
                parent: true,
                children: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        return updatedCategory;
    }

    /**
     * DELETE CATEGORY
     */
    async remove(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                        children: true,
                    },
                },
            },
        });

        if (!category) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }

        // Prevent deletion if has products
        if (category._count.products > 0) {
            throw new BadRequestException(
                `Cannot delete category with ${category._count.products} products. Move or delete products first.`,
            );
        }

        // Prevent deletion if has child categories
        if (category._count.children > 0) {
            throw new BadRequestException(
                `Cannot delete category with ${category._count.children} subcategories. Delete subcategories first.`,
            );
        }

        // Delete image from Cloudinary
        if (category.imageUrl) {
            const publicId = this.extractPublicId(category.imageUrl);
            await this.cloudinary.deleteImage(publicId);
        }

        await this.prisma.category.delete({
            where: { id },
        });

        return { message: 'Category deleted successfully' };
    }

    /**
     * HELPER: Generate slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    /**
     * HELPER: Extract Cloudinary public ID from URL
     */
    private extractPublicId(url: string): string {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return `categories/${filename.split('.')[0]}`;
    }
}