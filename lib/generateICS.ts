import * as ics from "ics";
import { TimetableEvent } from "@/types";

const DAY_LABELS = ["MO", "TU", "WE", "TH", "FR"];

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

export async function generateICS(events: TimetableEvent[]): Promise<string> {
  const icsEvents: ics.EventAttributes[] = [];
  const baseMonday = getNextMonday();

  for (const event of events) {
    if (event.day < 0 || event.day > 4) continue;

    const eventDate = new Date(baseMonday);
    eventDate.setDate(baseMonday.getDate() + event.day);

    const { h: startH, m: startM } = toHHMM(event.start);
    const durationMins = Math.round(event.duration * 60);

    const eventDateVector: ics.DateArray = [
      eventDate.getFullYear(),
      eventDate.getMonth() + 1,
      eventDate.getDate(),
      startH,
      startM,
    ];

    icsEvents.push({
      startInputType: "local",
      startOutputType: "local",
      title: event.title,
      start: eventDateVector,
      duration: { minutes: durationMins },
      location: event.location || "",
      recurrenceRule: `FREQ=WEEKLY;BYDAY=${DAY_LABELS[event.day]}`,
      alarms: [
        {
          action: "display",
          description: "Reminder",
          trigger: { minutes: 10, before: true },
        },
      ],
    });
  }

  return new Promise((resolve, reject) => {
    ics.createEvents(icsEvents, (error, value) => {
      if (error) {
        console.error("ICS generation error:", error);
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}
