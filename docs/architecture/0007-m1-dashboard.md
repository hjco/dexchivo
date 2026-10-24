# ADR 0007 · Dashboard M1

- Estado: Aceptado
- Fecha: 2026-10-23

## Decisión

- Next.js App Router, español primero.
- Puerta por sesión (redirige a `/login`).
- Gráfico con lightweight-charts.
- Uso de cookie httpOnly vía `credentials: include` hacia la API.
- Mostrar siempre modo PAPER/LIVE desde la API.

## Consecuencias

- SSR usa cookie del servidor para llamadas a API.
- SSE requiere credenciales en navegador.
