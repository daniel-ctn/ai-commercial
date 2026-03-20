import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from './entities/cart.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CartService } from './cart.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly cartService: CartService,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
      this.logger.log('Stripe initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — payments disabled');
    }
  }

  async createCheckoutSession(
    userId: string,
    couponCode?: string,
    shippingName?: string,
    shippingAddress?: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Payments are not configured');
    }

    const cart = await this.cartService.getOrCreateCart(userId);
    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    let coupon: Coupon | null = null;
    let discount = 0;

    if (couponCode) {
      coupon = await this.couponRepo.findOne({
        where: { code: couponCode, is_active: true },
      });
      if (!coupon) {
        throw new BadRequestException('Invalid or expired coupon');
      }
      const now = new Date();
      if (now < coupon.valid_from || now > coupon.valid_until) {
        throw new BadRequestException('Coupon is not currently valid');
      }

      const { subtotal } = this.cartService.calculateTotals(cart);
      if (coupon.min_purchase && subtotal < coupon.min_purchase) {
        throw new BadRequestException(
          `Minimum purchase of $${coupon.min_purchase} required for this coupon`,
        );
      }

      if (coupon.discount_type === 'percentage') {
        discount = +(subtotal * (coupon.discount_value / 100)).toFixed(2);
      } else {
        discount = +coupon.discount_value.toFixed(2);
      }
    }

    const { subtotal, total } = this.cartService.calculateTotals(cart, discount);

    const order = this.orderRepo.create({
      user_id: userId,
      coupon_id: coupon?.id ?? null,
      status: 'pending',
      subtotal,
      discount,
      total,
      shipping_name: shippingName ?? null,
      shipping_address: shippingAddress ?? null,
    });
    const savedOrder = await this.orderRepo.save(order);

    const orderItems = cart.items.map((item) =>
      this.orderItemRepo.create({
        order_id: savedOrder.id,
        product_id: item.product_id,
        shop_id: item.product?.shop_id,
        product_name: item.product?.name ?? 'Unknown',
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: +(item.unit_price * item.quantity).toFixed(2),
      }),
    );
    await this.orderItemRepo.save(orderItems);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: cart.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product?.name ?? 'Product',
            images: item.product?.image_url ? [item.product.image_url] : [],
          },
          unit_amount: Math.round(item.unit_price * 100),
        },
        quantity: item.quantity,
      })),
      ...(discount > 0
        ? {
            discounts: [
              {
                coupon: await this.getOrCreateStripeCoupon(discount, subtotal),
              },
            ],
          }
        : {}),
      metadata: { order_id: savedOrder.id },
      success_url: `${frontendUrl}/orders/${savedOrder.id}?status=success`,
      cancel_url: `${frontendUrl}/cart?status=cancelled`,
    });

    savedOrder.stripe_session_id = session.id;
    await this.orderRepo.save(savedOrder);

    return { checkout_url: session.url, order_id: savedOrder.id };
  }

  private async getOrCreateStripeCoupon(
    discountAmount: number,
    _subtotal: number,
  ): Promise<string> {
    const coupon = await this.stripe!.coupons.create({
      amount_off: Math.round(discountAmount * 100),
      currency: 'usd',
      duration: 'once',
    });
    return coupon.id;
  }

  async handleWebhookEvent(payload: Buffer, signature: string) {
    if (!this.stripe) return;

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping webhook');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await this.updateOrderStatus(orderId, 'paid', session.payment_intent as string);
          const order = await this.orderRepo.findOne({ where: { id: orderId } });
          if (order) {
            await this.cartService.clearCart(order.user_id);
          }
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          const order = await this.orderRepo.findOne({
            where: { stripe_payment_intent_id: paymentIntentId },
          });
          if (order) {
            order.status = 'refunded';
            await this.orderRepo.save(order);
          }
        }
        break;
      }
    }
  }

  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentIntentId?: string,
  ) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return;

    order.status = status;
    if (paymentIntentId) {
      order.stripe_payment_intent_id = paymentIntentId;
    }
    await this.orderRepo.save(order);
  }

  async getOrder(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) where.user_id = userId;

    const order = await this.orderRepo.findOne({
      where,
      relations: ['items', 'items.product', 'items.shop', 'coupon'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const [orders, total] = await this.orderRepo.findAndCount({
      where: { user_id: userId },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    order.status = status;
    return this.orderRepo.save(order);
  }

  async getShopOrders(shopId: string, page = 1, limit = 10, status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('item.shop_id = :shopId', { shopId })
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.created_at', 'DESC');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    const total = await qb.getCount();
    const orders = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
