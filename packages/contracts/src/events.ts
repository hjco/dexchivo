import { z } from 'zod';

import {
  CONTRACT_SCHEMA_VERSION,
  eventTypeSchema,
  producerSchema,
  utcDateTimeSchema,
} from './common';
import { orderIntentSchema } from './order';
import { signalPayloadSchema } from './signal';

export const eventEnvelopeSchema = z.strictObject({
  eventId: z.uuid(),
  eventType: eventTypeSchema,
  schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
  occurredAt: utcDateTimeSchema,
  correlationId: z.uuid(),
  producer: producerSchema,
  payload: z.unknown(),
});

export const signalCreatedEventSchema = eventEnvelopeSchema.extend({
  eventType: z.literal('strategy.signal.created'),
  payload: signalPayloadSchema,
});

export const orderIntentCreatedEventSchema = eventEnvelopeSchema.extend({
  eventType: z.literal('order.intent.created'),
  payload: orderIntentSchema,
});

export const typedEventSchema = z.discriminatedUnion('eventType', [
  signalCreatedEventSchema,
  orderIntentCreatedEventSchema,
]);

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
export type SignalCreatedEvent = z.infer<typeof signalCreatedEventSchema>;
export type OrderIntentCreatedEvent = z.infer<typeof orderIntentCreatedEventSchema>;
export type TypedEvent = z.infer<typeof typedEventSchema>;
