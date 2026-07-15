import "./types";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import ticketTypeRoutes from "./routes/ticketTypes";
import orderRoutes from "./routes/orders";
import ticketRoutes from "./routes/tickets";
import statusUpdateRoutes from "./routes/statusUpdates";
import reviewRoutes from "./routes/reviews";
import savedEventRoutes from "./routes/savedEvents";
import uploadRoutes from "./routes/upload";
import aiRoutes from "./routes/ai";
import userActivitiesRoutes from "./routes/userActivities";
import adminRoutes from "./routes/admin";
import notificationRoutes from "./routes/notifications";
import stripeConnectRoutes from "./routes/stripeConnect";
import billingRoutes from "./routes/billing";

const app = express();
const PORT = env.PORT || 5000;

// ─── Security & Logging ───────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow embedding (Stripe iframes)
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
  })
);

app.use(
  morgan(env.NODE_ENV === "production" ? "combined" : "dev")
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// ─── Body Parsing ─────────────────────────────────────────────────────────────

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use("/api/orders/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/ticket-types", ticketTypeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/status-updates", statusUpdateRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/saved-events", savedEventRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/user-activities", userActivitiesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stripe-connect", stripeConnectRoutes);
app.use("/api/billing", billingRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", message: "Route does not exist" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎵 VibeSocial API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Health      : http://localhost:${PORT}/health\n`);
});

export default app;
