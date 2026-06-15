/**
 * Brand colours needed as literal values OUTSIDE CSS — the few places a
 * var(--token) can't reach: the <meta name="theme-color">, the web manifest,
 * and icon generation. The CSS colour SoT is app/globals.css; these mirror
 * --primary / --bg for those non-CSS consumers. Keep them in sync.
 */
export const BRAND_PRIMARY = "#1f3a8a"; // --primary
export const BRAND_BG = "#f7f8fa"; // --bg
