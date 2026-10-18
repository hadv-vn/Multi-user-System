import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PasswordHasher } from './password-hasher.interface.js';

const DEFAULT_SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number;

  constructor(private readonly configService: ConfigService) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') ?? DEFAULT_SALT_ROUNDS;
  }

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
