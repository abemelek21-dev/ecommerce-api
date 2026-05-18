// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [CartModule], // ← import CartModule so CartService is available
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}