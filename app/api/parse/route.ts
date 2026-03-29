import { NextRequest, NextResponse } from "next/server";
import { parseTimetableImage } from "@/lib/gemini";
import { ParseAPIResponse } from "@/types";
import { ratelimit } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse<ParseAPIResponse>> {
  try {
    // 1. Vercel KV IP Rate Limiting
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, reset } = await ratelimit.limit(ip);
    
    if (!success) {
      const hoursRemaining = Math.max(1, Math.ceil((reset - Date.now()) / (1000 * 60 * 60)));
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Please try again in ${hoursRemaining} hours.` },
        { status: 429 }
      );
    }

    // 2. Strict Body Size Enforcement (Max ~6MB for images)
    const textBody = await req.text();
    if (textBody.length > 6 * 1024 * 1024) { 
      return NextResponse.json({ success: false, error: "Image payload too large. Max 6MB allowed." }, { status: 413 });
    }

    const data = JSON.parse(textBody);
    const { base64Image, mimeType } = data;

    // SECURITY FIX: Strict MIME format validation
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!base64Image || !allowedMimes.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: "Invalid image format. Please upload a JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const rawEvents = await parseTimetableImage(base64Image, mimeType);

    const validEvents = rawEvents.filter((ev) => ev.title && ev.title.trim() !== "" && typeof ev.day === 'number');

    return NextResponse.json({ success: true, events: validEvents });
  } catch (error: unknown) {
    console.error("Parse API Error:", error);
    
    // Explicitly handle malformed AI JSON responses to log and pass down
    if (error && typeof error === 'object' && 'raw' in error) {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI JSON response", raw: (error as Record<string, unknown>).raw },
        { status: 500 }
      );
    }

    return NextResponse.json(
      // SECURITY FIX 8: Prevent Information Disclosure by masking internal errors.
      { success: false, error: "Failed to process timetable. Please try again." },
      { status: 500 }
    );
  }
}
