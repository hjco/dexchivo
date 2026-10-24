import type { AuthStore, AuthUser } from './types';

export class InMemoryAuthStore implements AuthStore {
  private users = new Map<string, AuthUser>();

  constructor(users: AuthUser[] = []) {
    for (const user of users) {
      this.users.set(user.id, user);
      this.users.set(user.email.toLowerCase(), user);
    }
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.users.get(email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async updateTotpSecret(userId: string, secret: string | null): Promise<AuthUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('user not found');
    }
    const updated = { ...user, totpSecret: secret, updatedAt: new Date() };
    this.users.set(userId, updated);
    this.users.set(updated.email.toLowerCase(), updated);
    return updated;
  }

  async updateTotpEnabled(userId: string, enabled: boolean): Promise<AuthUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('user not found');
    }
    const updated = { ...user, totpEnabled: enabled, updatedAt: new Date() };
    this.users.set(userId, updated);
    this.users.set(updated.email.toLowerCase(), updated);
    return updated;
  }
}
