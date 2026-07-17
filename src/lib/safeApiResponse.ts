/** Reads an API response without exposing an HTML error page or JSON parser error to users. */
export async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The service returned an unexpected response. Please try again.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The service returned an invalid response. Please try again.");
  }
  return payload as Record<string, unknown>;
}
