import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { CsrfCookieIssuerInterceptor } from './csrf/csrf-cookie-issuer.interceptor.js';
import { CsrfTokenService } from './csrf/csrf-token.service.js';
import { CsrfGuard } from './csrf/csrf.guard.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { InMemoryRateLimiter } from './rate-limit/in-memory-rate-limiter.service.js';
import { RATE_LIMITER } from './rate-limit/rate-limiter.interface.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.service.js';
import { OpaqueTokenGenerator } from './security/opaque-token-generator.service.js';
import { PASSWORD_HASHER } from './security/password-hasher.interface.js';

@Global()
@Module({
  providers: [
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: RATE_LIMITER, useClass: InMemoryRateLimiter },
    OpaqueTokenGenerator,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    CsrfTokenService,
    CsrfGuard,
    CsrfCookieIssuerInterceptor,
  ],
  exports: [
    PASSWORD_HASHER,
    RATE_LIMITER,
    OpaqueTokenGenerator,
    CsrfTokenService,
    CsrfGuard,
    CsrfCookieIssuerInterceptor,
  ],
})
export class CommonModule {}
