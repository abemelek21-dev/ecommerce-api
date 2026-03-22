import { createParamDecorator,ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return data ? user?.[data] : user; // If a specific property is requested, return it, otherwise return the whole user object
    },
    // 0919399545
);