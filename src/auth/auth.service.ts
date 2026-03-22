// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { Role } from '@prisma/client';  // ← Import Role enum
import * as bcrypt from 'bcrypt';
import { jwtConfig } from 'jwt.config';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private userService: UserService,
        private jwtService: JwtService,
    ) { }

    /**
     * REGISTER NEW USER
     */
    async register(registerDto: RegisterDto, res: Response) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const user = await this.userService.create(registerDto);

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

        const { password, refreshToken, ...safeUser } = user;
        return safeUser;
    }

    /**
     * LOGIN USER
     */
    async login(loginDto: LoginDto, res: Response) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

        const { password, refreshToken, ...safeUser } = user;
        return safeUser;
    }

    /**
     * REFRESH ACCESS TOKEN
     */
    async refreshToken(userId: string, refreshToken: string, res: Response) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        const refreshTokenMatches = await bcrypt.compare(
            refreshToken,
            user.refreshToken,
        );

        if (!refreshTokenMatches) {
            throw new UnauthorizedException('Access denied');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

        return { message: 'Tokens refreshed successfully' };
    }

    /**
     * LOGOUT USER
     */
    async logout(userId: string, res: Response) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });

        this.clearTokenCookies(res);
        return { message: 'Logged out successfully' };
    }

    /**
     * VALIDATE USER (for LocalStrategy)
     */
    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return null;
        }

        const { password: _, ...result } = user;
        return result;
    }

    /**
     * HELPER: Generate access and refresh tokens
     */
    private async generateTokens(userId: string, email: string, role: Role) {
        const payload = {
            sub: userId,
            email,
            role: role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: jwtConfig.accessSecret,
                expiresIn: jwtConfig.accessExpiresIn,
            }),
            this.jwtService.signAsync(payload, {
                secret: jwtConfig.refreshSecret,
                expiresIn: jwtConfig.refreshExpiresIn,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    /**
     * HELPER: Update refresh token in database
     */
    private async updateRefreshToken(userId: string, refreshToken: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hashedRefreshToken },
        });
    }

    /**
     * HELPER: Set token cookies
     */
    private setTokenCookies(
        res: Response,
        accessToken: string,
        refreshToken: string,
    ) {
        res.cookie('auth_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }

    /**
     * HELPER: Clear token cookies
     */
    private clearTokenCookies(res: Response) {
        res.clearCookie('auth_token');
        res.clearCookie('refresh_token');
    }
}