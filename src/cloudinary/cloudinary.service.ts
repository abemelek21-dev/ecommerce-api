import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_APY_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRECT
        })
    }

    /**
   * Upload image to Cloudinary
   */

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'ecommerce'
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                    transformation: [
                        { width: 1000, height: 1000, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) return reject(error)
                    resolve(result!)
                }
            )
            uploadStream.end(file.buffer)
        })
    }

    /**
     * Delete image from Cloudinary
     */

    async deleteImage(publicId: string): Promise<any> {
        return cloudinary.uploader.destroy(publicId)
    }
    /**
     * Upload multiple images
     */
    async uploadMultipleImages(
        files: Express.Multer.File[],
        folder: string = 'ecommerce'
    ): Promise<string[]> {
        const uploadPromises = files.map((file) => this.uploadImage(file, folder));
        const results = await Promise.all(uploadPromises)
        return results.map((result) => result.secure_url)
    }

    
}
