/** Keep only namespaces consumed by Client Components in a route group. */
export function pickClientMessages<T extends Record<string, unknown>>(
  messages: T,
  namespaces: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    namespaces.flatMap((namespace) =>
      namespace in messages ? [[namespace, messages[namespace]]] : [],
    ),
  );
}
