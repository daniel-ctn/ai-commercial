import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CompareSummaryService {
  private readonly logger = new Logger(CompareSummaryService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generateSummary(ids: string[]): Promise<{ summary: string }> {
    if (!this.client) {
      return { summary: 'AI summary is not available. Set GEMINI_API_KEY to enable this feature.' };
    }

    if (ids.length < 2) {
      return { summary: 'Need at least 2 products to generate a comparison summary.' };
    }

    const products = await this.productsRepo.find({
      where: { id: In(ids), is_active: true },
      relations: ['shop', 'category'],
    });

    if (products.length < 2) {
      return { summary: 'Could not find enough products to compare.' };
    }

    const productsById = new Map(products.map((p) => [p.id, p]));
    const ordered = ids
      .map((id) => productsById.get(id))
      .filter((p): p is Product => p != null);

    const productDescriptions = ordered.map((p, i) => {
      const parts = [
        `Product ${i + 1}: ${p.name}`,
        `  Price: $${p.price}`,
      ];
      if (p.original_price && p.original_price > p.price) {
        const discount = Math.round((1 - p.price / p.original_price) * 100);
        parts.push(`  Original price: $${p.original_price} (${discount}% off)`);
      }
      if (p.shop?.name) parts.push(`  Shop: ${p.shop.name}`);
      if (p.category?.name) parts.push(`  Category: ${p.category.name}`);
      if (p.description) parts.push(`  Description: ${p.description.slice(0, 200)}`);
      if (p.attributes && Object.keys(p.attributes).length > 0) {
        parts.push(`  Specs: ${JSON.stringify(p.attributes)}`);
      }
      return parts.join('\n');
    });

    const prompt = `Compare these ${ordered.length} products and provide a concise shopping summary. Include:
1. **Best for price** — which product offers the lowest price or best discount
2. **Best for features** — which product has the strongest specs or attributes
3. **Best overall** — your recommendation considering price-to-value ratio

Only reference data that is actually provided below. Do not invent features or specs.
Keep the summary under 200 words. Use markdown formatting (bold, bullet points).

${productDescriptions.join('\n\n')}`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { temperature: 0.5, maxOutputTokens: 512 },
      });

      return { summary: response.text ?? 'Unable to generate summary.' };
    } catch (err) {
      this.logger.error('Failed to generate compare summary', err);
      return { summary: 'AI summary temporarily unavailable. Please try again later.' };
    }
  }
}
