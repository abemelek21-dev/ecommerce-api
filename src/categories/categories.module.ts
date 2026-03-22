import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
    imports: [CloudinaryModule]
})
export class CategoriesModule { }
