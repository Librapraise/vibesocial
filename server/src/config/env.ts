import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  SUPABASE_URL: z.string().url({ message: "SUPABASE_URL must be a valid URL" }),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  PLATFORM_FEE_PERCENT: z.string().default("10"), // % fee kept by platform on Connect charges

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@vibesocial.app"),
  ADMIN_EMAIL: z.string().optional(),

  // Storage
  MAX_UPLOAD_SIZE: z.string().default("10485760"),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  });
  // In dev, warn but continue — allows running without all keys configured
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: process.env.PORT || "5000",
      NODE_ENV: (process.env.NODE_ENV as any) || "development",
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
      PLATFORM_FEE_PERCENT: process.env.PLATFORM_FEE_PERCENT || "10",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM || "noreply@vibesocial.app",
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE || "10485760",
      CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:5173",
    };
