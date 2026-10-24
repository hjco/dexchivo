import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import type { MarketDataService } from './market-service';

export async function registerMarketRoutes(
  app: AppInstance,
  authService: AuthService,
  marketService: MarketDataService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get('/api/v1/markets', { preHandler: requireAuth }, async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return marketService.listInstruments();
  });

  app.get('/api/v1/markets/:instrumentId/candles', { preHandler: requireAuth }, async (request: any, reply) => {
    reply.header('cache-control', 'no-store');
    const { instrumentId } = request.params;
    const query = request.query as Record<string, string>;
    const timeframe = query.timeframe ?? '1m';
    const limit = query.limit ? Number(query.limit) : 100;
    return marketService.getCandles(instrumentId, timeframe, limit);
  });

  app.get('/api/v1/markets/:instrumentId/quotes', { preHandler: requireAuth }, async (request: any, reply) => {
    reply.header('cache-control', 'no-store');
    const { instrumentId } = request.params;
    return marketService.getQuote(instrumentId);
  });
}
