import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user_id: userId },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!cart) {
      cart = this.cartRepo.create({ user_id: userId });
      cart = await this.cartRepo.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    const product = await this.productRepo.findOne({ where: { id: productId, is_active: true } });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const cart = await this.getOrCreateCart(userId);

    const existing = cart.items.find((i) => i.product_id === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.unit_price = product.price;
      await this.itemRepo.save(existing);
    } else {
      const item = this.itemRepo.create({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        unit_price: product.price,
      });
      await this.itemRepo.save(item);
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = quantity;
    await this.itemRepo.save(item);

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.itemRepo.remove(item);
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { user_id: userId } });
    if (cart) {
      await this.itemRepo.delete({ cart_id: cart.id });
    }
  }

  calculateTotals(cart: Cart, discount = 0) {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const total = Math.max(0, subtotal - discount);
    return { subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), total: +total.toFixed(2) };
  }
}
