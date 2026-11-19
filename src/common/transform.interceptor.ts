import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { map, type Observable } from "rxjs";

export interface ApiResponse<T = unknown> {
  code: number;
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((result: unknown) => {
        if (response.headersSent) return result as ApiResponse;

        const status = response.statusCode;
        if (this.isObject(result) && typeof result.message === "string") {
          const { message, ...data } = result;
          return {
            code: status,
            success: true,
            message,
            data: Object.keys(data).length > 0 ? data : null,
          };
        }

        return {
          code: status,
          success: true,
          message: "操作成功",
          data: result ?? null,
        };
      }),
    );
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
