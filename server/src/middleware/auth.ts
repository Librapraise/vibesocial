import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

/**
 * requireAuth — verifies the Supabase JWT from the Authorization header.
 * Attaches `req.user` (the full users row) on success.
 * Returns 401 if missing/invalid, 403 if user not found in users table.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // Verify token with Supabase
  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !supabaseUser) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }

  // Fetch extended user profile from our users table
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", supabaseUser.id)
    .single();

  if (userError || !userRow) {
    // Auto-create profile if it doesn't exist (first login)
    const newUser = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.name || supabaseUser.email!.split("@")[0],
      avatar_url: supabaseUser.user_metadata?.avatar_url || null,
      role: "attendee",
      notification_settings: {
        push_enabled: true,
        event_start_alerts: true,
        status_updates: true,
        crowd_level_changes: true,
        wait_time_alerts: true,
        chat_mentions: true,
        weekly_digest: true,
      },
    };

    const { data: created } = await supabaseAdmin.from("users").insert(newUser).select().single();
    req.user = created || (newUser as any);
  } else {
    req.user = userRow;
  }

  next();
};

/**
 * optionalAuth — same as requireAuth but doesn't block if no token.
 * req.user will be undefined for unauthenticated requests.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user: supabaseUser } } = await supabaseAdmin.auth.getUser(token);

  if (supabaseUser) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (userRow) req.user = userRow;
  }

  next();
};

/**
 * requireRole — restrict route to specific roles.
 * Must be used after requireAuth.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", message: `Requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
};
