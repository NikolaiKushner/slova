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

/** Measure server-side reads without attaching user or content identifiers. */
export async function measureServerOperation<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await run();
    reportServerMetric("server_operation", {
      operation,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      succeeded: true,
    });
    return result;
  } catch (error) {
    reportServerFailure("server_operation", error, {
      operation,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      succeeded: false,
    });
    throw error;
  }
}
