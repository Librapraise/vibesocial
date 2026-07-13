import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { env } from "../config/env";

const router = Router();

/**
 * POST /api/ai/invoke
 * Takes a prompt (e.g. from ForYouSection), returns recommended event IDs.
 * Falls back to returning top-rated events if OpenAI key is not configured.
 */
router.post(
  "/invoke",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) throw new AppError("prompt is required", 400);

    // Fetch active events for context
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, title, venue_type, state, vibe_tags, current_vibe_score, status_count")
      .eq("is_active", true)
      .order("current_vibe_score", { ascending: false })
      .limit(30);

    if (!events || events.length === 0) {
      return res.json({ event_ids: [] });
    }

    // If no OpenAI key, return top-scoring events as fallback
    if (!env.OPENAI_API_KEY) {
      const topIds = events.slice(0, 4).map((e: any) => e.id);
      return res.json({ event_ids: topIds });
    }

    // Call OpenAI
    const eventContext = events
      .map((e: any) => `id:${e.id} | ${e.title} (${e.venue_type}, ${e.state}) tags:${(e.vibe_tags || []).join(",")} score:${e.current_vibe_score}`)
      .join("\n");

    const systemPrompt = `You are VibeSocial's AI assistant. Given a list of events and a user query, return a JSON object with "event_ids" — an array of up to 4 event IDs that best match the request. Only return IDs from the provided list. Return ONLY valid JSON.

Available events:
${eventContext}`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      const aiData = await response.json() as any;
      const content = aiData.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || "{}");

      const validIds = (parsed.event_ids || []).filter((id: string) =>
        events.some((e: any) => e.id === id)
      );

      return res.json({ event_ids: validIds.slice(0, 4) });
    } catch {
      // Graceful fallback
      const topIds = events.slice(0, 4).map((e: any) => e.id);
      return res.json({ event_ids: topIds });
    }
  })
);

export default router;
