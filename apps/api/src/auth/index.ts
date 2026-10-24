import type { FastifyBaseLogger } from 'fastify';

import type { AppConfig } from '../config';
import { AuthService } from './auth-service';
import type { AuthStore } from './types';

export interface CreateAuthServiceOptions {
  store: AuthStore;
  config: AppConfig;
  logger?: FastifyBaseLogger;
}

export function createAuthService(options: CreateAuthServiceOptions) {
  return new AuthService(options.store, options.config.auth);
}
