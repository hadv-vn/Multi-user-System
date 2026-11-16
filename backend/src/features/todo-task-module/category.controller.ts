import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CsrfCookieIssuerInterceptor } from '../../common/csrf/csrf-cookie-issuer.interceptor.js';
import { CsrfGuard } from '../../common/csrf/csrf.guard.js';
import { CurrentUser } from '../../session/current-user.decorator.js';
import { AuthGuard } from '../../session/guards/auth.guard.js';
import type { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';

import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryResult } from './category-result.interface.js';

@Controller('api/v1/categories')
@UseGuards(AuthGuard)
@UseInterceptors(CsrfCookieIssuerInterceptor)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(CsrfGuard)
  async create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: CreateCategoryDto,
  ): Promise<{ data: CategoryResult }> {
    const data = await this.categoryService.create(user.userId, dto);
    return { data };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUserContext): Promise<{ data: CategoryResult[] }> {
    const data = await this.categoryService.list(user.userId);
    return { data };
  }

  @Put(':id')
  @UseGuards(CsrfGuard)
  async update(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<{ data: CategoryResult }> {
    const data = await this.categoryService.update(user.userId, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfGuard)
  async remove(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.categoryService.remove(user.userId, id);
  }
}
