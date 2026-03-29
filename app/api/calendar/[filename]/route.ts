import { NextRequest, NextResponse } from "next/server";
import LZString from "lz-string";
import { generateICS } from "@/lib/generateICS";
import { expand } from "@/lib/googleCalendarLink";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const compressedState = searchParams.get("state");

    if (!compressedState) {
      return new NextResponse("Missing state parameter", { status: 400 });
    }

    // SECURITY FIX 1: Hard limit the compressed URL payload length (Prevent OOM/Decompression Bomb)
    if (compressedState.length > 5000) {
      return new NextResponse("Payload too large", { status: 413 });
    }

    // Decompress
    const serialized = LZString.decompressFromEncodedURIComponent(compressedState);
    
    // SECURITY FIX 2: Check decompressed size
    if (!serialized || serialized.length > 250000) {
      return new NextResponse("Invalid state parameter", { status: 400 });
    }

    let parsed: Record<string, unknown>[];
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return new NextResponse("Malformed JSON state", { status: 400 });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new NextResponse("No events found", { status: 404 });
    }

    // Expand minified keys back to full TimetableEvent shape
    const events = expand(parsed);

    const icsContent = await generateICS(events);

    // SECURITY FIX 3: Sanitize filename strictly to alphanumeric and hyphens (Prevent Header Injection)
    let safeFilename = params.filename ? params.filename.replace(/[^a-zA-Z0-9-]/g, '') : "timetable";
    safeFilename = `${safeFilename}.ics`;

    // Set headers for a calendar download / subscription
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error("Calendar export error:", error);
    return new NextResponse("Internal Server Error generating Calendar", { status: 500 });
  }
}
