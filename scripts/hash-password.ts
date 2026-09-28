/** Usage: bun scripts/hash-password.ts <password>
 * Prints the value to put in ADMIN_PASSWORD_HASH. */
import { hashPassword } from "../netlify/lib/auth";

const password = process.argv[2];
if (!password) {
  console.error("Usage: bun scripts/hash-password.ts <password>");
  process.exit(1);
}

console.log(hashPassword(password));
