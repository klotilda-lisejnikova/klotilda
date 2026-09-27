const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Where a photo loads from. Photos in the R2 bucket have an absolute URL; without a bucket (local
 * development) the API serves them itself at a relative `/api/files/:id`.
 */
export function mediaUrl(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
