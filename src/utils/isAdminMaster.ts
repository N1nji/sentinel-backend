import type { AuthRequest } from "../middleware/auth";

export function isAdminMaster(req: AuthRequest): boolean {
  const MASTER_EMAIL = process.env.ADMIN_MASTER_EMAIL;

  if (!MASTER_EMAIL) return false;

  return req.user?.email === MASTER_EMAIL;
}
