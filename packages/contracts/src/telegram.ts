import { z } from 'zod';

export const TelegramLinkTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

export const TelegramLinkRequestSchema = z.object({
  chatId: z.string().min(1),
});

export const TelegramAlertSchema = z.object({
  id: z.string(),
  type: z.enum([
    'SIGNAL',
    'RISK_REJECTION',
    'FILL',
    'STOP_TARGET',
    'DISCONNECT',
    'PAUSE',
    'CRITICAL_ERROR',
  ]),
  message: z.string(),
  sentAt: z.string(),
  delivered: z.boolean(),
});

export type TelegramLinkToken = z.infer<typeof TelegramLinkTokenSchema>;
export type TelegramLinkRequest = z.infer<typeof TelegramLinkRequestSchema>;
export type TelegramAlert = z.infer<typeof TelegramAlertSchema>;
