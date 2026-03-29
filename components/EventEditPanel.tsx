"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { TimetableEvent } from "@/types";
import { cn } from "@/lib/utils";

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI"];

interface EventEditPanelProps {
  event: TimetableEvent;
  onSave: (evt: TimetableEvent) => void;
  onClose: () => void;
  onDelete: () => void;
  isNew?: boolean;
}

const colorKeys = ['rose','violet','emerald','blue','amber','sky','indigo','cyan'];

export default function EventEditPanel({ event, onSave, onClose, onDelete, isNew }: EventEditPanelProps) {
  const [formData, setFormData] = useState<TimetableEvent>(event);

  useEffect(() => {
    setFormData(event);
  }, [event]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-sm bg-gray-900 h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200 border-l border-gray-800"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-100">{isNew ? "Add Event" : "Edit Event"}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject Title</label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 placeholder-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Room / Location</label>
            <input
              type="text"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 placeholder-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Day Active</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d, index) => (
                <button
                  key={d}
                  onClick={() => setFormData({ ...formData, day: index })}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold rounded-md transition-all border",
                    formData.day === index
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-inner"
                      : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Hour (e.g. 9.5)</label>
              <input
                type="number"
                step="0.5"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color Label</label>
            <div className="relative">
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-3 focus:bg-gray-800 transition-colors appearance-none"
              >
                {colorKeys.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 mt-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between shadow-lg">
          {!isNew ? (
            <button
              onClick={onDelete}
              className="inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300 focus:outline-none px-3 py-2 rounded-md hover:bg-red-950/50 border border-transparent hover:border-red-900/50 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-500 focus:outline-none transition-colors"
            >
              Save Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
