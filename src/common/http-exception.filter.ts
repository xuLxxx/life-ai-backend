import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

export interface ApiErrorResponse {
  code: number;
  success: false;
  message: string;
  data: null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getMessage(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(`[${request.method}] ${request.url}`, exception);
    }

    const body: ApiErrorResponse = {
      code: status,
      success: false,
      message,
      data: null,
    };
    response.status(status).json(body);
  }

  private getMessage(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") return response;
      if (this.isObject(response)) {
        if (typeof response.message === "string") return response.message;
        if (Array.isArray(response.message) && response.message.length > 0) {
          return response.message.map(String).join("; ");
        }
      }
      return exception.message;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return "服务器内部错误";
    }
    return "请求失败";
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
