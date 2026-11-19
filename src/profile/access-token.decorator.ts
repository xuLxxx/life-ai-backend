import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const AccessToken = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const authorization = context.switchToHttp().getRequest().headers.authorization as string | undefined;
  return authorization?.replace(/^Bearer /i, '');
});
