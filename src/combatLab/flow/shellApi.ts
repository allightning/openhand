/** Cross-file shell calls. Assigned as each module loads, invoked only after boot. */
export const api = {} as Record<string, (...args: any[]) => any>;
