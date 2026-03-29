"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { TimetableEvent } from "@/types";
import EventEditPanel from "./EventEditPanel";
import { cn } from "@/lib/utils";

interface WeeklyCalendarProps {
  events: TimetableEvent[];
  onChange: (events: TimetableEvent[]) => void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const TIME_LABELS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

// Dark mode adapted colors
const colorMap: Record<string, string> = {
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/20',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/20 hover:border-sky-500/40 hover:bg-sky-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/20',
};

export default function WeeklyCalendar({ events, onChange }: WeeklyCalendarProps) {
  const [editState, setEditState] = useState<{ index: number; event: TimetableEvent } | null>(null);

  const handleSave = (updatedEvent: TimetableEvent) => {
    const newEvents = [...events];
    if (editState?.index === -1) {
      newEvents.push(updatedEvent);
    } else if (editState !== null) {
      newEvents[editState.index] = updatedEvent;
    }
    onChange(newEvents);
    setEditState(null);
  };

  const handleDelete = () => {
    if (editState && editState.index !== -1) {
      const newEvents = events.filter((_, i) => i !== editState.index);
      onChange(newEvents);
    }
    setEditState(null);
  };

  const handleCreateNew = () => {
    setEditState({
      index: -1,
      event: {
        id: crypto.randomUUID(),
        title: "New Subject",
        location: "",
        day: 0,
        start: 9,
        duration: 1,
        color: "blue"
      },
    });
  };

  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden relative flex flex-col group transition-colors duration-300">
      <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
        <h2 className="text-lg font-semibold text-gray-100">Events Schedule</h2>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Event
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain custom-scrollbar">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-gray-800 bg-gray-900">
            <div className="py-3" /> {/* Empty corner */}
            {DAYS.map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider border-l border-gray-800/50">
                {day}
              </div>
            ))}
          </div>

          {/* Grid area */}
          <div className="relative bg-gray-900" style={{ height: 1000 }}>
            {/* Horizontal lines every hour = 96px now as we span 10h total over 960px or similar */}
            {TIME_LABELS.map((label, idx) => (
              <div 
                key={label}
                className="absolute w-full flex items-start pointer-events-none"
                style={{ top: idx * 96 }}
              >
                <div className="w-[80px] text-xs text-gray-500 font-medium text-right pr-4 pt-1">
                  {label}
                </div>
                <div className="flex-1 border-t border-gray-800 border-dashed w-full h-px mt-[11px]" />
              </div>
            ))}

            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] absolute inset-0 pointer-events-none min-h-[960px]">
              <div /> {/* time labels column */}
              {DAYS.map((_, colIdx) => (
                <div key={colIdx} className="relative border-l border-gray-800/50 pointer-events-auto h-full">
                  {/* Map events that occur on this day */}
                  {events.map((event, originalIndex) => {
                    if (event.day !== colIdx) return null;

                    const topPx = Math.max(0, (event.start - 8) * 96);
                    const heightPx = Math.max(48, event.duration * 96);
                    // Cap at bottom of calendar
                    const cappedHeight = Math.min(heightPx, 960 - topPx);

                    const colorClass = colorMap[event.color] || colorMap.indigo;

                    return (
                      <div
                        key={`${event.id}`}
                        onClick={() => setEditState({ index: originalIndex, event })}
                        className={cn(
                          "absolute left-1 right-1 rounded-md p-2 overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-offset-2 hover:ring-offset-gray-900 hover:z-10 group/block border backdrop-blur-sm",
                          colorClass
                        )}
                        style={{ top: topPx, height: cappedHeight }}
                      >
                        <div className="font-semibold text-xs leading-tight mb-0.5 truncate tracking-tight">{event.title}</div>
                        {event.location && (
                          <div className="text-[10px] leading-tight opacity-80 truncate">{event.location}</div>
                        )}
                        
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editState && (
        <EventEditPanel
          event={editState.event}
          isNew={editState.index === -1}
          onSave={handleSave}
          onClose={() => setEditState(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
