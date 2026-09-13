// Resolve a stored image reference to a URL the ADMIN app can preview.
//
// Uploaded website images are saved into the website's public/uploads folder
// and stored as "/uploads/<file>". Those are served by the WEBSITE origin
// (default http://localhost:3001), not the admin app — so a bare "/uploads/.."
// path 404s inside the admin app. This prefixes upload paths with the website
// origin for previews. External http(s) URLs and blob: previews pass through.
//
// Configure the website origin with NEXT_PUBLIC_WEBSITE_ORIGIN (no trailing
// slash), e.g. https://missolution.com.bd in production.
export function previewUrl(ref: string): string {
  const v = (ref ?? "").trim();
  if (!v) return v;
  if (v.startsWith("/uploads/")) {
    const origin = (
      process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || "http://localhost:3001"
    ).replace(/\/$/, "");
    return `${origin}${v}`;
  }
  return v; // http(s):// or blob: — use as-is
}
