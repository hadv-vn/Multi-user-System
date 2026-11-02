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
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CsrfCookieIssuerInterceptor } from '../../common/csrf/csrf-cookie-issuer.interceptor.js';
import { CsrfGuard } from '../../common/csrf/csrf.guard.js';
import { CurrentUser } from '../../session/current-user.decorator.js';
import { AuthGuard } from '../../session/guards/auth.guard.js';
import type { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';

import { CreateTaskDto } from './dto/create-task.dto.js';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskResult } from './task-result.interface.js';
import { TaskService } from './task.service.js';

@Controller('api/v1/tasks')
@UseGuards(AuthGuard)
@UseInterceptors(CsrfCookieIssuerInterceptor)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(CsrfGuard)
  async create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: CreateTaskDto,
  ): Promise<{ data: TaskResult }> {
    const data = await this.taskService.create(user.userId, dto);
    return { data };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: ListTasksQueryDto,
  ): Promise<{ data: TaskResult[] }> {
    const data = await this.taskService.list(user.userId, query.status);
    return { data };
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: TaskResult }> {
    const data = await this.taskService.getById(user.userId, id);
    return { data };
  }

  @Put(':id')
  @UseGuards(CsrfGuard)
  async update(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<{ data: TaskResult }> {
    const data = await this.taskService.update(user.userId, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfGuard)
  async remove(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.taskService.remove(user.userId, id);
  }
}
