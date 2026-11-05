import { Controller, Get, Param, ParseUUIDPipe, UseGuards, UseInterceptors } from '@nestjs/common';

import { CsrfCookieIssuerInterceptor } from '../../common/csrf/csrf-cookie-issuer.interceptor.js';
import { RolesGuard } from '../../rbac/guards/roles.guard.js';
import { ROLE_NAME } from '../../rbac/role.constants.js';
import { Roles } from '../../rbac/roles.decorator.js';
import { AuthGuard } from '../../session/guards/auth.guard.js';

import { UserTaskStatisticsRecord } from './repositories/task-statistics-record.interface.js';
import { TaskStatisticsService } from './task-statistics.service.js';

/**
 * Thống kê task cho ADMIN — chỉ số liệu tổng hợp, KHÔNG có nội dung task
 * (SRS A-3, NFR-004). Nằm trong feature module ToDo để AdminModule lõi
 * không phụ thuộc vào nghiệp vụ Task.
 */
@Controller('api/v1/admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE_NAME.ADMIN)
@UseInterceptors(CsrfCookieIssuerInterceptor)
export class AdminTaskStatisticsController {
  constructor(private readonly taskStatisticsService: TaskStatisticsService) {}

  @Get(':id/task-stats')
  async getUserTaskStatistics(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: UserTaskStatisticsRecord }> {
    const data = await this.taskStatisticsService.getUserStatistics(id);
    return { data };
  }
}
