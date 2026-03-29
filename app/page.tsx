"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import ExportPanel from "@/components/ExportPanel";
import { TimetableEvent, ParseAPIResponse } from "@/types";

export default function Home() {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    // SECURITY FIX: Prevent browser tab crashing via massive OOM allocation
    if (file.size > 20 * 1024 * 1024) { // Bumped up since we do client compression
      setError("Image payload too large. Max 20MB allowed before compression.");
      return;
    }

    setIsParsing(true);
    setError(null);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      
      const MAX_DIMENSION = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
           width = Math.round((width * MAX_DIMENSION) / height);
           height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Failed to initialize compression.");
        setIsParsing(false);
        return;
      }

      // Draw and compress to lightweight JPEG
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const base64String = dataUrl.split(",")[1];

      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
            body: JSON.stringify({
              base64Image: base64String,
              mimeType: "image/jpeg",
            }),
        });

        let data: ParseAPIResponse;
        try {
          data = await response.json();
        } catch {
          // Fallback if Vercel Edge/Platform intercepts and returns non-JSON text
          if (response.status === 413) {
            throw new Error("Image payload too large. Max 6MB allowed.");
          } else if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          throw new Error(`Server Error (${response.status}): Failed to parse API response.`);
        }

        if (!data.success) {
          throw new Error(data.error || "Parsing failed.");
        }

        if (!data || !Array.isArray(data.events)) {
          throw new Error("Could not read timetable properly. Try cropping tighter.");
        }

        setEvents(data.events);
      } catch (error) {
        const err = error as Error;
        console.error("Upload error:", err);
        setError(err.message || "An unexpected error occurred while parsing the image.");
      } finally {
        setIsParsing(false);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("Failed to decode the image for compression.");
      setIsParsing(false);
    };

    img.src = objectUrl;
  };

  const handleEventsChange = (newEvents: TimetableEvent[]) => {
    setEvents(newEvents);
  };

  const uniqueSubjectsCount = new Set(events.map((e) => e.title)).size;
  const daysCoveredCount = new Set(events.map((e) => e.day)).size;

  const isHeroMode = events.length === 0;

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col text-gray-100 transition-colors duration-500">
      <header className="bg-gray-900 border-b border-gray-800 transition-colors duration-500 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-50 tracking-tight">SnapCal</h1>
              <p className="mt-1 text-sm text-gray-400">From screenshot to schedule in seconds. Turn your college timetable into an interactive calendar automatically.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-500">
        {error && (
          <div className="rounded-xl bg-red-950/80 p-5 mb-8 border border-red-800 shadow-2xl transition-all duration-300 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-red-400">Upload Rejected</h3>
              <div className="mt-1 text-sm text-red-200/90 leading-relaxed font-medium">
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {isHeroMode ? (
          /* HERO STATE (No Events) */
          <div className="max-w-4xl mx-auto mt-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Schedule, simplified.</h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto">
                Upload a screenshot of your timetable. We&apos;ll parse the grid and generate a beautiful calendar.
              </p>
            </div>
            <div className="bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 overflow-hidden transform transition-all hover:border-gray-700">
              <UploadZone onFileSelect={handleFileSelect} isLoading={isParsing} large={true} />
            </div>
          </div>
        ) : (
          /* DASHBOARD STATE (Events Loaded or Parsing) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-1 overflow-hidden">
                <UploadZone onFileSelect={handleFileSelect} isLoading={isParsing} large={false} />
              </div>
              
              {events.length > 0 && <ExportPanel events={events} />}
              
              {events.length > 0 && (
                <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Summary</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <dt className="text-xs font-medium text-gray-400 truncate">Classes</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-100">{events.length}</dd>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <dt className="text-xs font-medium text-gray-400 truncate">Subjects</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-100">{uniqueSubjectsCount}</dd>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 col-span-2 border border-gray-700/50">
                      <dt className="text-xs font-medium text-gray-400 truncate">Days Covered</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-100">{daysCoveredCount}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* Main Calendar Area */}
            <div className="lg:col-span-2">
              {isParsing ? (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-sm h-full min-h-[600px] flex items-center justify-center">
                  <div className="animate-pulse space-y-8 w-full max-w-lg mx-auto">
                    <div className="h-6 bg-gray-800 rounded w-1/3 mx-auto"></div>
                    <div className="grid grid-cols-5 gap-3">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-800/50 rounded-lg border border-gray-700/30"></div>
                      ))}
                    </div>
                    <p className="text-center text-sm text-gray-400 mt-6 animate-pulse">
                      Analyzing grid... This usually takes 10–15 seconds.
                    </p>
                  </div>
                </div>
              ) : events.length > 0 ? (
                <WeeklyCalendar events={events} onChange={handleEventsChange} />
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
