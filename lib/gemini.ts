import { TimetableEvent } from "@/types";

// SECURITY FIX 4: Remove server-side sleep/retry loops to prevent Vercel connection exhaustion.
// We try exactly once. If Gemini fails, we fail fast and let the client handle retries.
async function failFastFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP error! status: ${res.status}, body: ${text}`);
  }
  return await res.json();
}

export async function parseTimetableImage(
  base64Image: string,
  mimeType: string
): Promise<TimetableEvent[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env.local");

  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  // ==========================================
  // PASS 1: SPATIAL GRID DESCRIPTION (IMAGE -> TEXT)
  // ==========================================
  const pass1Prompt = `
ACT AS A HIGH-SPEED OCR SCANNER.
Analyze the timetable grid and output ONLY a shorthand text map.
Format: [DAY] | [TIME] | [SUBJECT/BATCH] | [ROOM]
Example: WED | 02:00 PM | STAT(T1) | E-201
If a cell has multiple stacked classes (different batches), list each one on its own line.
Do not write sentences. No introductions. Just the raw shorthand.
`;


  const pass1Payload = {
    contents: [{
      parts: [
        { text: pass1Prompt },
        { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };

  const pass1Result = await failFastFetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pass1Payload)
  });

  const gridDescription = pass1Result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!gridDescription) throw new Error("Pass 1 Failed: Could not read grid structure.");

  // ==========================================
  // PASS 2: JSON EXTRACTION (TEXT -> JSON)
  // ==========================================
  const pass2Prompt = `
You are a JSON formatter. Convert the provided shorthand text into a valid JSON array of event objects.
Ensure 'STAT(T1)' and 'STAT(T2)' in the same slot become separate event objects in the array.
Respond ONLY with the JSON array.

RULES:
- Map days string to integer: MON=0, TUE=1, WED=2, THU=3, FRI=4.
- Make "startTime" and "endTime" strings using 24-hour time format (e.g. "14:00").
- Room becomes "location".

Input:
${gridDescription}

Output strict JSON ONLY:
{ "events": [{ "title": "...", "location": "...", "day": 0, "startTime": "09:00", "endTime": "09:50" }] }
`;

  const pass2Payload = {
    contents: [{ parts: [{ text: pass2Prompt }] }],
    generationConfig: { responseMimeType: "application/json", response_mime_type: "application/json", temperature: 0.1 }
  };

  const pass2Result = await failFastFetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pass2Payload)
  });

  const jsonText = pass2Result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("Pass 2 Failed: Could not format JSON.");

  // ==========================================
  // POST-PROCESSING & SANITIZATION
  // ==========================================
  const timeStringToFloat = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  let parsedData;
  const cleanJson = jsonText.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim();
  
  try {
    parsedData = JSON.parse(cleanJson);
  } catch {
    console.error("Failed to parse JSON. Raw text:", jsonText);
    const parseError = new Error("Failed to parse AI JSON response") as Error & { raw?: string };
    parseError.raw = jsonText;
    throw parseError;
  }

  try {
    const rawEvents = Array.isArray(parsedData.events) ? parsedData.events : [];

    interface RawEvent {
      title?: string;
      location?: string;
      day?: string | number;
      startTime?: string;
      endTime?: string;
    }

    // Safety filter to destroy any stray EMPTY ghost blocks
    const events = rawEvents.filter((ev: RawEvent) => {
      const title = String(ev.title || "").toUpperCase();
      return title !== "EMPTY" && title !== "";
    });

    const colorKeys = ['rose', 'violet', 'emerald', 'blue', 'amber', 'sky', 'indigo', 'cyan'];
    // SECURITY FIX 5: Use Map instead of plain object to prevent Prototype Pollution
    const subjectColors = new Map<string, string>();
    let colorIdx = 0;

    return events.map((ev: RawEvent) => {
      // 1. Clean Title & Strip CRLF (Prevent ICS Property Injection)
      let cleanTitle = String(ev.title || "Unknown").replace(/[\r\n]+/g, " ").trim().substring(0, 100);
      if (cleanTitle.includes('(')) {
        cleanTitle = cleanTitle.split('(')[0].trim();
      }

      // 2. Clean Location (Destroy nulls & Strip CRLF)
      let cleanLocation = String(ev.location || "").replace(/[\r\n]+/g, " ").trim().substring(0, 100);
      const garbage = ["null", "undefined", "none", "n/a", "unknown", "false"];
      if (garbage.includes(cleanLocation.toLowerCase())) cleanLocation = "";

      // 3. Float Math & PM Correction + Lab Failsafe
      const startFloat = timeStringToFloat(ev.startTime || "");
      const endFloat = timeStringToFloat(ev.endTime || "");

      // AUTO-CORRECT 12hr PM times — no college has classes at 2 AM.
      // If the AI failed to convert "2:50" → "14:50", this fixes it.
      // Threshold of 7 is safe: any time < 7:00 on a timetable must be PM.
      const correctedStart = (startFloat > 0 && startFloat < 7) ? startFloat + 12 : startFloat;
      let correctedEnd = (endFloat > 0 && endFloat < 7) ? endFloat + 12 : endFloat;

      // Lab Failsafe: if AI missed the 2-slot span, force ~100 min duration
      if (cleanTitle.toUpperCase().includes("LAB") && (correctedEnd - correctedStart) < 1.2) {
        correctedEnd = correctedStart + 1.66;
      }

      // 4. Color Assignment (Using Map)
      if (!subjectColors.has(cleanTitle)) {
        subjectColors.set(cleanTitle, colorKeys[colorIdx % colorKeys.length]);
        colorIdx++;
      }

      return {
        id: crypto.randomUUID(),
        title: cleanTitle,
        location: cleanLocation,
        // 5. Bounds Validation
        day: Math.min(Math.max(0, parseInt(String(ev.day || 0)) || 0), 4),
        start: Math.min(Math.max(0, correctedStart), 24),
        duration: Math.max(0.83, correctedEnd - correctedStart),
        color: subjectColors.get(cleanTitle) || "blue"
      };
    });
  } catch (err) {
    console.error("Failed to parse JSON:", err, jsonText);
    throw new Error("Failed to map the timetable data to the calendar.");
  }
}
