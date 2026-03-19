import { Controller, Get, Header } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';

@Controller()
export class SitemapController {
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Shop) private readonly shopsRepo: Repository<Shop>,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemap(): Promise<string> {
    const [products, shops] = await Promise.all([
      this.productsRepo.find({
        where: { is_active: true },
        select: ['id', 'created_at'],
        order: { created_at: 'DESC' },
        take: 5000,
      }),
      this.shopsRepo.find({
        where: { is_active: true },
        select: ['id', 'created_at'],
        order: { created_at: 'DESC' },
      }),
    ]);

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/products', priority: '0.9', changefreq: 'daily' },
      { loc: '/shops', priority: '0.8', changefreq: 'weekly' },
      { loc: '/deals', priority: '0.8', changefreq: 'daily' },
      { loc: '/compare', priority: '0.6', changefreq: 'weekly' },
      { loc: '/about', priority: '0.4', changefreq: 'monthly' },
    ];

    const urls = [
      ...staticPages.map(
        (p) =>
          `  <url><loc>${this.frontendUrl}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
      ),
      ...products.map(
        (p) =>
          `  <url><loc>${this.frontendUrl}/products/${p.id}</loc><lastmod>${p.created_at.toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      ),
      ...shops.map(
        (s) =>
          `  <url><loc>${this.frontendUrl}/shops/${s.id}</loc><lastmod>${s.created_at.toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
      ),
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}
