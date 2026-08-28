/** Public art paths must respect Vite `base` (GitHub Pages uses `/openhand/`). */
export function artUrl(path: string): string {
  const cleaned = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  if (base === "./" || base === ".") return `./${cleaned}`;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${cleaned}`;
}
