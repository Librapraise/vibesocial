import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sendEmail } from "../services/emailService";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

const createTicketSchema = z.object({
  category: z.string().min(2),
  subject: z.string().min(3),
  message: z.string().min(5),
});

/**
 * POST /api/support
 * Create a support ticket and email administrators.
 */
router.post(
  "/",
  requireAuth,
  validate(createTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, subject, message } = req.body;
    const userId = req.user!.id;

    // Fetch user details to log and email
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: userId,
        category,
        subject,
        message,
        status: "open",
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Notify administrators
    const adminEmail = process.env.EMAIL_FROM || "admin@vibesocial.app";
    try {
      await sendEmail({
        to: adminEmail,
        subject: `⚠️ New Support Complaint: [${category}] ${subject}`,
        html: `
          <h2>New Support Ticket Logged</h2>
          <p>A user has submitted a new complaint on the VibeSocial platform:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; color: #1f2937; margin: 15px 0;">
            <strong>Ticket ID:</strong> ${ticket.id}<br/>
            <strong>User:</strong> ${user?.name || "Unknown"} (${user?.email || "N/A"})<br/>
            <strong>Category:</strong> ${category}<br/>
            <strong>Subject:</strong> ${subject}<br/>
            <strong>Date:</strong> ${new Date(ticket.created_at).toLocaleString()}<br/>
            <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 10px 0;"/>
            <strong>Message:</strong><br/>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p>Please review this ticket and resolve it from your Admin Dashboard.</p>
        `,
      });
    } catch (err) {
      console.error("Failed to dispatch admin notification email for support ticket:", err);
    }

    res.status(201).json(ticket);
  })
);

export default router;
