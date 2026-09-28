/** Minimal shape of Netlify's v2 function Context we actually use — avoids taking a
 * dependency on @netlify/functions just for a type. */
export interface FunctionContext {
  ip?: string;
  params?: Record<string, string>;
}
