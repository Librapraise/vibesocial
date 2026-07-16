import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sendEmail } from "../services/emailService";
import { env } from "../config/env";

const router = Router();

/**
 * GET /api/venue-applications
 * List applications (all for admins, or applicant's own applications)
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    let query = supabaseAdmin.from("venue_applications").select("*");

    // If not an admin, only show their own applications
    if (req.user!.role !== "admin") {
      query = query.eq("user_id", req.user!.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

/**
 * POST /api/venue-applications
 * Create a new venue application
 */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      venue_name,
      venue_type,
      address,
      city,
      state,
      capacity,
      applicant_name,
      applicant_email,
      applicant_phone,
      applicant_role,
      description,
      website,
      social_media,
      images,
    } = req.body;

    if (!venue_name || !address || !applicant_name || !applicant_email) {
      throw new AppError("Required fields missing", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("venue_applications")
      .insert({
        user_id: req.user!.id,
        venue_name,
        venue_type,
        address,
        city,
        state,
        capacity: capacity ? Number(capacity) : null,
        applicant_name,
        applicant_email,
        applicant_phone,
        applicant_role,
        description,
        website,
        social_media,
        images: images || [],
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    // Send confirmation email to applicant
    await sendEmail({
      to: applicant_email,
      subject: "Venue Application Received - VibeSocial",
      html: `
        <h2>Application Received</h2>
        <p>Hi ${applicant_name},</p>
        <p>Thank you for submitting a venue application for <strong>${venue_name}</strong> to VibeSocial.</p>
        <p>Our admin team is currently reviewing your details. We will notify you by email as soon as a decision is made.</p>
        <br/>
        <p>Best regards,<br/>The VibeSocial Team</p>
      `
    }).catch(err => console.error("Failed to send submission confirmation email:", err));

    // Send alert email to admin
    const adminEmail = env.EMAIL_FROM || "admin@vibesocial.app";
    await sendEmail({
      to: adminEmail,
      subject: `🚨 New Venue Application: ${venue_name}`,
      html: `
        <h2>New Venue Partner Application</h2>
        <p>A new venue application has been submitted for review:</p>
        <ul>
          <li><strong>Venue:</strong> ${venue_name} (${venue_type})</li>
          <li><strong>Applicant:</strong> ${applicant_name} (${applicant_role})</li>
          <li><strong>Location:</strong> ${address}, ${city}, ${state}</li>
          <li><strong>Email:</strong> ${applicant_email}</li>
        </ul>
        <p>Log in to the Admin Dashboard to review and approve/reject this listing.</p>
      `
    }).catch(err => console.error("Failed to send admin alert email:", err));

    res.status(201).json(data);
  })
);

/**
 * PUT /api/venue-applications/:id
 * Update/Approve a venue application (Admin or Owner only)
 */
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("venue_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) throw new AppError("Venue application not found", 404);

    // Only allow admin or the applicant themselves to update
    if (existing.user_id !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Forbidden", 403);
    }

    // If changing status to approved and the requester is admin, promote user to organizer!
    const isApproving = req.body.status === "approved" && existing.status !== "approved";
    const isRejecting = req.body.status === "rejected" && existing.status !== "rejected";

    if ((isApproving || isRejecting) && req.user!.role !== "admin") {
      throw new AppError("Only admins can change approval status of venue applications", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("venue_applications")
      .update({
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    // If approved, update user's role to "organizer"
    if (isApproving) {
      await supabaseAdmin
        .from("users")
        .update({ role: "organizer" })
        .eq("id", existing.user_id);

      // Send approval email
      await sendEmail({
        to: existing.applicant_email,
        subject: "Your Venue Application is Approved! 🎉 - VibeSocial",
        html: `
          <h2>Your Venue Application is Approved! 🎉</h2>
          <p>Hi ${existing.applicant_name},</p>
          <p>We are excited to let you know that your venue application for <strong>${existing.venue_name}</strong> has been approved!</p>
          <p>You have been promoted to an <strong>Organizer</strong> on VibeSocial. You can now host events and list ticket types for your venue.</p>
          <p>Log in to your dashboard to get started.</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send approval email:", err));

      // Trigger user notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Venue Approved! 🎉",
          message: `Your venue application for ${existing.venue_name} has been approved!`,
          target_type: "organizer",
          link_url: "/OrganizerPortal",
        });
      } catch (err) {
        console.error("Failed to create approval notification:", err);
      }

    } else if (isRejecting) {
      // If rejected/brought down, demote user's role back to "attendee"
      await supabaseAdmin
        .from("users")
        .update({ role: "attendee" })
        .eq("id", existing.user_id);

      // Send rejection email
      const reason = req.body.rejection_reason || "No specific reason provided.";
      await sendEmail({
        to: existing.applicant_email,
        subject: "Update on Your Venue Application - VibeSocial",
        html: `
          <h2>Venue Application Update</h2>
          <p>Hi ${existing.applicant_name},</p>
          <p>Thank you for your interest in listing your venue <strong>${existing.venue_name}</strong> on VibeSocial.</p>
          <p>After reviewing your application, we are unable to approve it at this time.</p>
          <p><strong>Reason for rejection:</strong><br/>
          ${reason}</p>
          <p>You can review your details and submit a new application or update your information in your profile.</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send rejection email:", err));

      // Trigger user notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Venue Application Update",
          message: `Your application for ${existing.venue_name} was declined: ${reason}`,
          target_type: "all",
        });
      } catch (err) {
        console.error("Failed to create rejection notification:", err);
      }
    }

    res.json(data);
  })
);

export default router;
