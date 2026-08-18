import type { ProblemDetails } from "@/types/api";

/**
 * Thin fetch wrapper.
 *
 * Requests go to this app's own origin; next.config.ts rewrites /api/* to the C# API.
 * The API returns RFC 7807 problem documents for 400/409/502, so those are unwrapped
 * into a readable message rather than surfacing as "Request failed".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;

  constructor(status: number, title: string, detail?: string) {
    super(detail?.trim() ? `${title}: ${detail}` : title);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
  }

  /** Soset writes are disabled — a configuration state, not a failure. */
  get isSosetWriteDisabled(): boolean {
    return this.status === 409 && this.title.toLowerCase().includes("soset");
  }

  /** The FoxPro side could not be read. */
  get isSosetUnreachable(): boolean {
    return this.status === 502;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | null = null;

  try {
    const text = await response.text();
    if (text) problem = JSON.parse(text) as ProblemDetails;
  } catch {
    // Non-JSON body; fall through to the status text.
  }

  return new ApiError(
    response.status,
    problem?.title ?? response.statusText ?? "Request failed",
    problem?.detail,
  );
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | string[] | null | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;

    if (Array.isArray(value)) {
      // Repeated key per value (?title=Foo&title=Bar), which is what the API's minimal
      // endpoints bind string[]? parameters from — used for column filter selections.
      for (const item of value) {
        if (item === "") continue;
        params.append(key, item);
      }
      continue;
    }

    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal, query } = options;

  const response = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) throw await toApiError(response);

  // 204 No Content is used by DELETE /orders/{id} and the tracking endpoints.
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    request<T>(path, { method: "GET", query, signal }),

  post: <T>(path: string, body?: unknown, query?: RequestOptions["query"]) =>
    request<T>(path, { method: "POST", body, query }),

  put: <T>(path: string, body?: unknown, query?: RequestOptions["query"]) =>
    request<T>(path, { method: "PUT", body, query }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /**
   * Multipart form upload (file inputs). Deliberately not routed through request(): that
   * helper always JSON-encodes the body and sets Content-Type: application/json, which
   * would send the file as a stringified object instead of a real upload. The browser sets
   * the multipart boundary itself, so no Content-Type header is passed here.
   */
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const response = await fetch(path, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) throw await toApiError(response);

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },

  /**
   * POST that returns a raw text body rather than JSON — for the proof preview endpoint,
   * which responds with a self-contained HTML document. Not routed through request(): that
   * helper always JSON.parses the response body, which would throw on HTML.
   */
  postText: async (path: string, body: unknown): Promise<string> => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) throw await toApiError(response);

    return response.text();
  },
};
