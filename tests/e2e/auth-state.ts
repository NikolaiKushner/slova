import path from "node:path";

export const AUTH_STATE_PATH = path.join(
  process.cwd(),
  "playwright/.auth/user.json",
);
