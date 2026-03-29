"use client";

import React, { useState, useEffect } from "react";
import { Download, Link as LinkIcon, ExternalLink } from "lucide-react";
import { TimetableEvent } from "@/types";
import { createEventLink, createSubscriptionLink } from "@/lib/googleCalendarLink";
import { generateICS } from "@/lib/generateICS";

interface ExportPanelProps {
  events: TimetableEvent[];
}

export default function ExportPanel({ events }: ExportPanelProps) {
  const [hostUrl, setHostUrl] = useState<string>("");

  useEffect(() => {
    setHostUrl(window.location.origin);
  }, []);

  const handleDownloadICS = async () => {
    try {
      const icsString = await generateICS(events);
      const blob = new Blob([icsString], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "timetable.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download ICS", error);
      alert("Failed to generate ICS file");
    }
  };

  const handleSubscribe = () => {
    if (!hostUrl) return;
    const url = createSubscriptionLink(hostUrl, events);
    window.open(url, "_blank");
  };

  if (events.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-6 space-y-4 w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Export Options</h3>
      
      <button
        onClick={handleDownloadICS}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg transition-colors group shadow-sm touch-manipulation"
      >
        <div className="flex items-center space-x-3">
          <Download className="h-5 w-5" />
          <span className="font-medium flex-1 text-left">Download .ICS File</span>
        </div>
        <span className="text-xs text-blue-500/70 group-hover:text-blue-500 transition-colors">
          Universal format
        </span>
      </button>

      <div className="pt-4 border-t border-gray-800 space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-1">Google Calendar</h4>
        
        <button
          onClick={handleSubscribe}
          className="w-full flex items-center justify-between px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors group shadow-sm touch-manipulation"
        >
          <div className="flex items-center space-x-3">
            <LinkIcon className="h-5 w-5" />
            <span className="font-medium flex-1 text-left">Subscribe via Webcal</span>
          </div>
          <span className="text-xs text-red-500/70 group-hover:text-red-500 transition-colors">Auto-sync</span>
        </button>

        <div className="bg-gray-950 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar border border-gray-800 mt-2 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Add Events Manually</span>
            <span className="text-gray-600">({events.length})</span>
          </div>
          {events.map((event) => (
            <a
              key={event.id}
              href={createEventLink(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-600 hover:bg-gray-800 rounded-md transition-all group text-sm shadow-sm hover:shadow"
            >
              <span className="font-medium text-gray-300 truncate mr-2 group-hover:text-white transition-colors">
                {event.title}
              </span>
              <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
