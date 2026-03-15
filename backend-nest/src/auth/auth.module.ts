/**
 * Auth Module — wires together auth controller, service, JWT, and Passport
 *
 * This is the "wiring" module. In Next.js, you'd set up NextAuth with:
 *   export const { auth, signIn, signOut } = NextAuth({ providers: [...] })
 *
 * In NestJS, the module declares:
 *   - imports: other modules it needs (Users for user lookup, JWT for token signing)
 *   - controllers: HTTP handlers (AuthController)
 *   - providers: services (AuthService, JwtStrategy)
 *   - exports: what other modules can use from this module
 *
 * JwtModule.registerAsync configures the JWT signing key and default options.
 * PassportModule tells NestJS to use Passport for auth strategies.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('SECRET_KEY'),
        signOptions: {
          algorithm: config.get('ALGORITHM', 'HS256') as 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
