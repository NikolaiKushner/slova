type MetricFields = Record<string, number | string | boolean | null>;

/** Structured server metrics that remain queryable in Vercel Runtime Logs. */
export function reportServerMetric(
  event: string,
  fields: MetricFields,
): void {
  console.info(
    JSON.stringify({
      level: "info",
      event,
      occurredAt: new Date().toISOString(),
      ...fields,
    }),
  );
}

/** Structured background failures without leaking request or user payloads. */
export function reportServerFailure(
  event: string,
  error: unknown,
  fields: MetricFields = {},
): void {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      occurredAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ...fields,
    }),
  );
}
