import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  GoogleGenAI,
  Type,
  FunctionDeclaration,
  Content,
  Part,
  GenerateContentConfig,
} from '@google/genai';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Category } from '../categories/entities/category.entity';
import { Coupon } from '../coupons/entities/coupon.entity';

export interface ChatEvent {
  event: 'status' | 'chunk' | 'done' | 'error';
  data: Record<string, unknown>;
}

const SYSTEM_INSTRUCTION = `You are a helpful shopping assistant for AI Commercial, an online platform \
where users browse products, compare prices, and find coupons/deals.

Your capabilities via tools:
- Search products by name, category, or price range
- Get detailed product information
- Find active coupons and deals
- Look up shop information and their product catalog
- Compare products side by side

Guidelines:
- Always use tools to look up real data — never invent products or prices.
- When mentioning products, include the name, price, and shop name.
- If a product is on sale, highlight the original price and the discount.
- When showing coupons, include the code, discount amount, and expiry.
- Be concise and helpful. Use bullet points or short paragraphs.
- If no results are found, say so and suggest alternatives or broader searches.
- For product comparisons, highlight key differences (price, features, shop).`;

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description:
      'Search for products by name, category, or price range. Returns up to 10 matching active products with pricing and shop info.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search term to match against product names' },
        category: { type: Type.STRING, description: "Category slug to filter by (e.g., 'laptops', 'phones')" },
        min_price: { type: Type.NUMBER, description: 'Minimum price filter' },
        max_price: { type: Type.NUMBER, description: 'Maximum price filter' },
        on_sale: { type: Type.BOOLEAN, description: 'If true, only return products currently on sale' },
      },
    },
  },
  {
    name: 'get_product_details',
    description:
      'Get full details of a specific product including attributes, description, and pricing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: { type: Type.STRING, description: 'The UUID of the product' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'find_coupons',
    description: 'Find currently active coupons and deals, optionally filtered by shop name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        shop_name: { type: Type.STRING, description: 'Filter coupons by shop name (partial match)' },
      },
    },
  },
  {
    name: 'get_shop_info',
    description:
      'Get information about a shop including its product catalog and active coupons.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        shop_name: { type: Type.STRING, description: 'The name of the shop to look up (partial match)' },
      },
      required: ['shop_name'],
    },
  },
  {
    name: 'compare_products',
    description: 'Compare 2–5 products side by side. Returns detailed info for each product.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_ids: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of 2–5 product UUIDs to compare',
        },
      },
      required: ['product_ids'],
    },
  },
];

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_products: 'Searching products',
  get_product_details: 'Getting product details',
  find_coupons: 'Finding coupons',
  get_shop_info: 'Looking up shop info',
  compare_products: 'Comparing products',
};

const MAX_TOOL_ROUNDS = 5;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Coupon)
    private readonly couponsRepo: Repository<Coupon>,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async *generateChatResponse(
    messages: Array<{ role: string; content: string }>,
  ): AsyncGenerator<ChatEvent> {
    if (!this.client) {
      yield { event: 'error', data: { message: 'AI service is not configured. Set GEMINI_API_KEY.' } };
      return;
    }

    const contents: Content[] = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const config: GenerateContentConfig = {
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      maxOutputTokens: 2048,
    };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await this.client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config,
        });
      } catch (err) {
        this.logger.error('Gemini API error', err);
        yield { event: 'error', data: { message: 'AI service temporarily unavailable. Please try again.' } };
        return;
      }

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        const text =
          response.text || "I'm not sure how to help with that. Could you try rephrasing?";
        yield { event: 'chunk', data: { text } };
        yield { event: 'done', data: { text } };
        return;
      }

      contents.push(response.candidates![0].content!);

      const functionResponseParts: Part[] = [];
      for (const fc of functionCalls) {
        const display = TOOL_DISPLAY_NAMES[fc.name!] ?? fc.name;
        yield { event: 'status', data: { message: `${display}...` } };

        const result = await this.executeTool(fc.name!, (fc.args as Record<string, unknown>) ?? {});
        functionResponseParts.push({
          functionResponse: { name: fc.name!, response: result },
        });
      }

      contents.push({ role: 'tool' as string, parts: functionResponseParts } as Content);
    }

    const fallback =
      'I had trouble processing your request. Could you try asking in a different way?';
    yield { event: 'chunk', data: { text: fallback } };
    yield { event: 'done', data: { text: fallback } };
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      switch (name) {
        case 'search_products':
          return await this.searchProducts(args);
        case 'get_product_details':
          return await this.getProductDetails(args);
        case 'find_coupons':
          return await this.findCoupons(args);
        case 'get_shop_info':
          return await this.getShopInfo(args);
        case 'compare_products':
          return await this.compareProducts(args);
        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      this.logger.error(`Tool execution error for ${name}`, err);
      return { error: `Failed to execute ${name}` };
    }
  }

  private async searchProducts(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.is_active = :active', { active: true });

    const query = args.query as string | undefined;
    if (query) {
      qb.andWhere('product.name ILIKE :search', { search: `%${query}%` });
    }

    const categorySlug = args.category as string | undefined;
    if (categorySlug) {
      qb.andWhere('category.slug = :catSlug', { catSlug: categorySlug });
    }

    if (args.min_price != null) {
      qb.andWhere('product.price >= :minPrice', { minPrice: args.min_price });
    }

    if (args.max_price != null) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: args.max_price });
    }

    if (args.on_sale) {
      qb.andWhere('product.original_price IS NOT NULL');
      qb.andWhere('product.original_price > product.price');
    }

    const products = await qb
      .orderBy('product.created_at', 'DESC')
      .take(10)
      .getMany();

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: (p.description ?? '').slice(0, 200),
        price: p.price,
        original_price: p.original_price,
        image_url: p.image_url,
        shop_name: p.shop?.name ?? null,
        category_name: p.category?.name ?? null,
        on_sale: p.original_price != null && p.original_price > p.price,
      })),
      total_found: products.length,
    };
  }

  private async getProductDetails(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const productId = args.product_id as string;
    if (!productId) return { error: 'Invalid product ID' };

    const product = await this.productsRepo.findOne({
      where: { id: productId, is_active: true },
      relations: ['shop', 'category'],
    });

    if (!product) return { error: 'Product not found' };

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      attributes: product.attributes,
      shop_name: product.shop?.name ?? null,
      category_name: product.category?.name ?? null,
      on_sale: product.original_price != null && product.original_price > product.price,
    };
  }

  private async findCoupons(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const now = new Date();
    const qb = this.couponsRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.shop', 'shop')
      .where('coupon.is_active = :active', { active: true })
      .andWhere('coupon.valid_from <= :now', { now })
      .andWhere('coupon.valid_until >= :now', { now });

    const shopName = args.shop_name as string | undefined;
    if (shopName) {
      qb.andWhere('shop.name ILIKE :shopName', { shopName: `%${shopName}%` });
    }

    const coupons = await qb
      .orderBy('coupon.valid_until', 'ASC')
      .take(20)
      .getMany();

    return {
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        min_purchase: c.min_purchase,
        valid_until: c.valid_until.toISOString(),
        shop_name: c.shop?.name ?? null,
      })),
      total_found: coupons.length,
    };
  }

  private async getShopInfo(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const shopName = (args.shop_name as string) ?? '';

    const shop = await this.shopsRepo
      .createQueryBuilder('shop')
      .where('shop.name ILIKE :name', { name: `%${shopName}%` })
      .andWhere('shop.is_active = :active', { active: true })
      .getOne();

    if (!shop) return { error: `No shop found matching '${shopName}'` };

    const products = await this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.shop_id = :shopId', { shopId: shop.id })
      .andWhere('product.is_active = :active', { active: true })
      .orderBy('product.created_at', 'DESC')
      .take(10)
      .getMany();

    const now = new Date();
    const coupons = await this.couponsRepo.find({
      where: {
        shop_id: shop.id,
        is_active: true,
        valid_from: LessThanOrEqual(now),
        valid_until: MoreThanOrEqual(now),
      },
    });

    return {
      shop: {
        id: shop.id,
        name: shop.name,
        description: shop.description,
        website: shop.website,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        original_price: p.original_price,
        category_name: p.category?.name ?? null,
      })),
      active_coupons: coupons.map((c) => ({
        code: c.code,
        description: c.description,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        valid_until: c.valid_until.toISOString(),
      })),
    };
  }

  private async compareProducts(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rawIds = (args.product_ids as string[]) ?? [];
    if (rawIds.length < 2) return { error: 'Need at least 2 products to compare' };
    if (rawIds.length > 5) return { error: 'Can compare at most 5 products' };

    const products = await this.productsRepo.find({
      where: { id: In(rawIds), is_active: true },
      relations: ['shop', 'category'],
    });

    const productsById = new Map(products.map((p) => [p.id, p]));
    const ordered = rawIds
      .map((id) => productsById.get(id))
      .filter((p): p is Product => p != null);

    if (ordered.length < 2) return { error: 'Could not find enough products to compare' };

    return {
      products: ordered.map((p) => ({
        id: p.id,
        name: p.name,
        description: (p.description ?? '').slice(0, 200),
        price: p.price,
        original_price: p.original_price,
        image_url: p.image_url,
        attributes: p.attributes,
        shop_name: p.shop?.name ?? null,
        category_name: p.category?.name ?? null,
        on_sale: p.original_price != null && p.original_price > p.price,
      })),
    };
  }
}
