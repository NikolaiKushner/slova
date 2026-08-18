type ClientEventFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Small structured event until the project chooses an external logger. */
export function reportClientEvent(
  event: string,
  fields: ClientEventFields = {},
): void {
  console.error({
    level: "error",
    event,
    occurredAt: new Date().toISOString(),
    ...fields,
  });
}
