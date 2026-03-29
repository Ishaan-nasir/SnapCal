import { TimetableEvent } from "@/types";
import LZString from "lz-string";

const DAY_RRULE = ["MO", "TU", "WE", "TH", "FR"];

const getNextMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
  d.setHours(0, 0, 0, 0);
  return d;
};

const toHHMM = (t: number) => {
  const h = Math.floor(t);
  const m = Math.round((t % 1) * 60);
  return { h, m };
};

const pad = (n: number) => n.toString().padStart(2, "0");

// Returns YYYYMMDDTHHMMSS in local time (no Z — floats local timezone)
function formatLocalDateTime(date: Date, timeFloat: number): string {
  const { h, m } = toHHMM(timeFloat);
  const local = new Date(date.getTime());
  local.setHours(h, m, 0, 0);
  return (
    local.getFullYear().toString() +
    pad(local.getMonth() + 1) +
    pad(local.getDate()) +
    "T" +
    pad(local.getHours()) +
    pad(local.getMinutes()) +
    "00"
  );
}

export function createEventLink(event: TimetableEvent): string {
  if (event.day < 0 || event.day > 4) return "#";

  const baseMonday = getNextMonday();
  const eventDate = new Date(baseMonday);
  eventDate.setDate(baseMonday.getDate() + event.day);

  const endFloat = event.start + event.duration;
  const startParam = formatLocalDateTime(eventDate, event.start);
  const endParam = formatLocalDateTime(eventDate, endFloat);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.location ? `Location: ${event.location}` : "",
    location: event.location || "",
    dates: `${startParam}/${endParam}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${DAY_RRULE[event.day]}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Minify event keys to reduce LZString URL size (~40-50% smaller)
const minify = (events: TimetableEvent[]) =>
  events.map((e) => ({
    t: e.title,
    l: e.location,
    d: e.day,
    s: e.start,
    u: e.duration,
    c: e.color,
  }));

export const expand = (mini: Record<string, unknown>[]): TimetableEvent[] =>
  mini.map((e, i) => ({
    id: i.toString(),
    title: String(e.t || ""),
    location: String(e.l || ""),
    day: Number(e.d || 0),
    start: Number(e.s || 0),
    duration: Number(e.u || 0),
    color: String(e.c || ""),
  }));

export function createSubscriptionLink(
  hostUrl: string,
  events: TimetableEvent[]
): string {
  const serialized = JSON.stringify(minify(events));
  const compressed = LZString.compressToEncodedURIComponent(serialized);
  const icsUrl = `${hostUrl}/api/calendar/timetable.ics?state=${compressed}`;
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsUrl)}`;
}
