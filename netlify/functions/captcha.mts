import { createCaptcha } from "../lib/captcha";
import { json, methodNotAllowed } from "../lib/respond";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();
  return json(createCaptcha());
}
