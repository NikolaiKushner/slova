const MAX_REPORT_BYTES = 16 * 1024;

type CspReport = Record<string, unknown>;

function safeField(report: CspReport, key: string): string | number | null {
  const value = report[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 500);
  return null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  try {
    const body = JSON.parse(raw) as CspReport;
    const report = (body["csp-report"] ?? body) as CspReport;
    console.warn(JSON.stringify({
      level: "warning",
      event: "security.csp.violation",
      occurredAt: new Date().toISOString(),
      documentUri: safeField(report, "document-uri"),
      effectiveDirective: safeField(report, "effective-directive"),
      violatedDirective: safeField(report, "violated-directive"),
      blockedUri: safeField(report, "blocked-uri"),
      sourceFile: safeField(report, "source-file"),
      lineNumber: safeField(report, "line-number"),
      columnNumber: safeField(report, "column-number"),
      disposition: safeField(report, "disposition"),
    }));
  } catch {
    return new Response(null, { status: 400 });
  }

  return new Response(null, { status: 204 });
}
