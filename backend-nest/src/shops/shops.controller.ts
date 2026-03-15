/**
 * Shops Controller — HTTP layer for shop CRUD
 *
 * Key NestJS patterns demonstrated:
 *   @Query()  → reads URL query params (like searchParams in Next.js)
 *   @Param()  → reads URL path params (like params in Next.js dynamic routes)
 *   @Body()   → reads JSON request body (like request.json() in Next.js)
 *
 *   ParseUUIDPipe → validates that :id is a valid UUID before the handler runs
 *   (like a Zod .uuid() check in a server action)
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { QueryShopsDto } from './dto/query-shops.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  findAll(@Query() query: QueryShopsDto) {
    return this.shopsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateShopDto, @CurrentUser() user: User) {
    return this.shopsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDto,
    @CurrentUser() user: User,
  ) {
    return this.shopsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopsService.remove(id, user);
  }
}
