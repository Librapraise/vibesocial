import { env } from "../config/env";

import { supabaseAdmin } from "../config/supabase";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Resolves the email addresses of all administrators.
 * Looks for ADMIN_EMAIL env variable (comma-separated), then falls back to users table where role = 'admin'.
 */
export async function getAdminEmails(): Promise<string[]> {
  const envAdminEmail = env.ADMIN_EMAIL;
  if (envAdminEmail) {
    return envAdminEmail.split(",").map(e => e.trim()).filter(Boolean);
  }

  try {
    const { data: admins, error } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("role", "admin");

    if (error) {
      console.error("[Email Service] Error fetching admin emails from DB:", error);
    } else if (admins && admins.length > 0) {
      return admins.map((u: any) => u.email).filter(Boolean);
    }
  } catch (err) {
    console.error("[Email Service] Exception fetching admin emails from DB:", err);
  }

  // Final fallback
  return ["admin@vibesocial.app"];
}

/**
 * Wraps simple HTML body content in a beautiful, premium, brand-aligned email template wrapper.
 */
function wrapHtmlTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #09090b;
      color: #fafafa;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 30px 40px;
      border-bottom: 1px solid #27272a;
      text-align: center;
      background-color: #09090b;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #f97316;
      text-decoration: none;
      letter-spacing: -1px;
    }
    .logo span {
      color: #fafafa;
    }
    .content {
      padding: 40px;
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d8;
    }
    .content h1, .content h2 {
      color: #ffffff;
      font-weight: 800;
      margin-top: 0;
      letter-spacing: -0.5px;
    }
    .content h2 {
      font-size: 20px;
      margin-bottom: 20px;
    }
    .button-container {
      margin: 30px 0;
    }
    .button {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: #ffffff !important;
      padding: 12px 28px;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      border-radius: 10px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);
    }
    .footer {
      padding: 30px 40px;
      border-top: 1px solid #27272a;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      background-color: #09090b;
    }
    .footer a {
      color: #f97316;
      text-decoration: none;
    }
    /* Common utilities for emails */
    .info-box {
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      color: #d4d4d8;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: rgba(249, 115, 22, 0.1);
      color: #f97316;
      border: 1px solid rgba(249, 115, 22, 0.2);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://vibesocial-zeta.vercel.app" class="logo">VIBE<span>SOCIAL</span></a>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>© 2026 VibeSocial. All rights reserved.</p>
        <p>If you have any questions, please contact our support team at <a href="mailto:support@vibesocial.app">support@vibesocial.app</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends an email using the Resend REST API.
 * If no valid API key is configured, it falls back to logging the email details to the console.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || "noreply@vibesocial.app";
  const toList = Array.isArray(to) ? to : [to];

  // Automatically wrap simple HTML snippets in our brand layout template
  const isFullHtml = html.includes("<html") || html.includes("<!DOCTYPE");
  const formattedHtml = isFullHtml ? html : wrapHtmlTemplate(subject, html);

  console.log(`\n[Email Service] Preparing to send email:\n  To: ${toList.join(", ")}\n  Subject: ${subject}\n  From: ${from}`);

  if (!apiKey || apiKey === "re_your-resend-api-key" || apiKey === "your-resend-api-key") {
    // Strip HTML elements for clean terminal display preview
    const textFallback = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`[Email Service][MOCK FALLBACK] (No valid RESEND_API_KEY configured)\nEmail Body Text preview: "${textFallback}"\n`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `VibeSocial <${from}>`,
        to: toList,
        subject,
        html: formattedHtml,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Email Service] Resend API error: ${response.status} - ${errText}`);
      return false;
    }

    const data = await response.json();
    console.log(`[Email Service] Email sent successfully via Resend. ID:`, (data as any).id);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send email via Resend API:`, error);
    return false;
  }
}

