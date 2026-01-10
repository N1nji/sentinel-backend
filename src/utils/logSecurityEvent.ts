// backend/src/utils/logSecurityEvent.ts
import type { Request } from "express";
import SecurityLog from "../models/SecurityLog";

interface LogSecurityEventParams {
  action:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "LOGOUT"
    | "USER_BLOCKED"
    | "USER_UNBLOCKED"
    | "TOKEN_INVALID"
    | "ACCESS_DENIED";

  userId?: string;
  email?: string;
  req: Request;
  details?: string;
}

export async function logSecurityEvent({
  action,
  userId,
  email,
  req,
  details,
}: LogSecurityEventParams) {
  try {
    await SecurityLog.create({
      userId,
      email,
      action,
      ip:
        req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.socket.remoteAddress ||
        "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      details,
    });
  } catch (err) {
    //  NUNCA quebrar a aplicação por causa de log
    console.error("Erro ao registrar SecurityLog:", err);
  }
}
