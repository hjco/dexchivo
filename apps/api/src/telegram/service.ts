import { randomUUID } from 'node:crypto';

export class TelegramService {
  private linked = new Map<string, string>();
  private allowlist = new Set<string>();

  async createLinkToken(): Promise<{ token: string; expiresAt: string }> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }

  async linkChat(chatId: string): Promise<{ linked: boolean }> {
    this.allowlist.add(chatId);
    this.linked.set(chatId, 'linked');
    return { linked: true };
  }

  async sendAlert(type: string, message: string) {
    return {
      id: randomUUID(),
      type,
      message,
      sentAt: new Date().toISOString(),
      delivered: true,
    };
  }

  getStatus() {
    return { linked: this.linked.size > 0, allowlistCount: this.allowlist.size };
  }
}
