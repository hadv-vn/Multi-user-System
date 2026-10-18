import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { AppException } from '../exceptions/app.exception.js';
import { ErrorDetailItem } from '../exceptions/error-detail-item.interface.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetailItem[];
    retryAfterSeconds?: number;
  };
}

/**
 * Bắt mọi exception, chuẩn hoá về đúng response envelope lỗi (api-spec 1.4).
 * Là nơi DUY NHẤT build response lỗi — controller không tự build.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      this.sendResponse(response, exception.getStatus(), {
        error: {
          code: exception.errorCode,
          message: exception.message,
          details: exception.details,
          retryAfterSeconds: exception.retryAfterSeconds,
        },
      });
      return;
    }

    if (exception instanceof BadRequestException) {
      this.sendResponse(response, HttpStatus.BAD_REQUEST, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu gửi lên không hợp lệ.',
          details: this.extractValidationDetails(exception),
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      this.sendResponse(response, exception.getStatus(), {
        error: {
          code: 'HTTP_ERROR',
          message: exception.message,
        },
      });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : exception,
    );
    this.sendResponse(response, HttpStatus.INTERNAL_SERVER_ERROR, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
      },
    });
  }

  private sendResponse(response: Response, status: number, body: ErrorResponseBody): void {
    if (body.error.retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', String(body.error.retryAfterSeconds));
    }
    response.status(status).json(body);
  }

  private extractValidationDetails(exception: BadRequestException): ErrorDetailItem[] | undefined {
    const response = exception.getResponse() as { message?: unknown };
    if (!Array.isArray(response.message)) {
      return undefined;
    }
    return (response.message as unknown[]).map((issue) => {
      const text = String(issue);
      return { field: text.split(' ')[0] ?? 'unknown', issue: text };
    });
  }
}
