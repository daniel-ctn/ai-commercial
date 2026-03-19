import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class AiCatalogService {
  private readonly logger = new Logger(AiCatalogService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generateDescription(productId: string): Promise<{ description: string }> {
    if (!this.client) {
      return { description: 'AI is unavailable. Set GEMINI_API_KEY to enable.' };
    }

    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['shop', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    const context = [
      `Product: ${product.name}`,
      product.category?.name ? `Category: ${product.category.name}` : null,
      product.shop?.name ? `Sold by: ${product.shop.name}` : null,
      `Price: $${product.price}`,
      product.original_price ? `Original price: $${product.original_price}` : null,
      product.attributes && Object.keys(product.attributes).length > 0
        ? `Attributes: ${JSON.stringify(product.attributes)}`
        : null,
      product.description ? `Current description: ${product.description}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Write a compelling, professional product description for an e-commerce listing.
Use the information below. Keep it concise (2-3 sentences), highlight key selling points,
and make it suitable for a product page. Do not add information not present below.

${context}`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { temperature: 0.7, maxOutputTokens: 300 },
      });
      return { description: response.text ?? 'Unable to generate description.' };
    } catch (err) {
      this.logger.error('AI description generation failed', err);
      return { description: 'AI temporarily unavailable. Please try again later.' };
    }
  }

  async generateAttributes(productId: string): Promise<{ attributes: Record<string, string> }> {
    if (!this.client) {
      return { attributes: {} };
    }

    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    const context = [
      `Product: ${product.name}`,
      product.category?.name ? `Category: ${product.category.name}` : null,
      product.description ? `Description: ${product.description}` : null,
      product.attributes && Object.keys(product.attributes).length > 0
        ? `Current attributes: ${JSON.stringify(product.attributes)}`
        : null,
    ].filter(Boolean).join('\n');

    const prompt = `Based on the product info below, suggest 3-6 structured key-value attributes
(like "Material: Stainless Steel", "Weight: 250g") that would help shoppers compare products.
Respond ONLY with a valid JSON object, no explanation. Only infer from the given data.

${context}`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 300 },
      });

      const text = (response.text ?? '').replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(text);
      return { attributes: parsed };
    } catch (err) {
      this.logger.error('AI attribute generation failed', err);
      return { attributes: {} };
    }
  }

  async getQualityReport(productId: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    if (!product.image_url) {
      issues.push('Missing product image');
      suggestions.push('Add a high-quality product image to improve click-through rates');
      score -= 25;
    }
    if (!product.description || product.description.length < 20) {
      issues.push('Missing or very short description');
      suggestions.push('Add a detailed description (2-3 sentences minimum)');
      score -= 25;
    }
    if (!product.attributes || Object.keys(product.attributes).length === 0) {
      issues.push('No product attributes/specifications');
      suggestions.push('Add attributes like material, dimensions, or weight for better search');
      score -= 15;
    }
    if (!product.original_price) {
      suggestions.push('Consider adding an original price to show deal value');
      score -= 5;
    }
    if (!product.category_id) {
      issues.push('Not assigned to a category');
      suggestions.push('Assign a category for better discoverability');
      score -= 15;
    }
    if (product.name.length < 10) {
      issues.push('Product name is very short');
      suggestions.push('Use a more descriptive product name');
      score -= 15;
    }

    return { score: Math.max(0, score), issues, suggestions };
  }
}
