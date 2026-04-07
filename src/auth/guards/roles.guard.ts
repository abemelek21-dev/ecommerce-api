import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {

        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true; // If no roles are required, allow access
        }

        // Get the user from the request (assuming it's set by an authentication guard)
        const { user } = context.switchToHttp().getRequest();
        return requiredRoles.includes(user.role); // Check if user has any of the required roles
    }
}