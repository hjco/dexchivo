# ADR 0006 · Datos de mercado públicos M1

- Estado: Aceptado
- Fecha: 2026-10-23

## Decisión

- Binance USD-M Futures REST `exchangeInfo` y `klines` + WebSocket `@kline_*`.
- Normalización a contratos tipados con strings decimales.
- Persistir `instruments` y `candles` en PostgreSQL; servir caché con `source: CACHE` si Binance
  falla.
- SSE autenticado para actualizaciones en tiempo real.
- Sin claves de API de exchange.

## Consecuencias

- Dependiente de disponibilidad pública de Binance.
- La caché puede servir datos antiguos y debe etiquetarse explícitamente.
- Solo símbolos configurados se sincronizan.
