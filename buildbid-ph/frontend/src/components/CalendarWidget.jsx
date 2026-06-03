import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Sample events: { date: "YYYY-MM-DD", title, type }
const sampleEvents = [
  { date: "2024-06-24", title: "Site Inspection", type: "inspection" },
  { date: "2024-06-26", title: "Contract Signing", type: "contract" },
  { date: "2024-06-28", title: "Progress Review", type: "meeting" },
  { date: "2024-07-01", title: "Payment Due", type: "payment" },
  { date: "2024-07-05", title: "Foundation Check", type: "inspection" },
];

const typeColors = {
  inspection: "bg-blue-500",
  contract: "bg-orange-500",
  meeting: "bg-purple-500",
  payment: "bg-green-500",
};

export default function CalendarWidget({ events = sampleEvents, compact = false }) {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const daysInPrev = new Date(current.year, current.month, 0).getDate();

  function prevMonth() {
    setCurrent((c) => c.month === 0
      ? { year: c.year - 1, month: 11 }
      : { year: c.year, month: c.month - 1 }
    );
  }

  function nextMonth() {
    setCurrent((c) => c.month === 11
      ? { year: c.year + 1, month: 0 }
      : { year: c.year, month: c.month + 1 }
    );
  }

  function getEventsForDay(day) {
    const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  }

  function isToday(day) {
    return day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
  }

  // Build calendar grid
  const cells = [];
  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          {MONTHS[current.month]} {current.year}
        </h2>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={15} />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, idx) => {
          const dayEvents = cell.current ? getEventsForDay(cell.day) : [];
          return (
            <div
              key={idx}
              className={`relative text-center py-1 rounded-lg cursor-pointer transition-colors
                ${cell.current ? "text-gray-700 hover:bg-orange-50" : "text-gray-300"}
                ${cell.current && isToday(cell.day) ? "bg-orange-500 text-white hover:bg-orange-600 font-bold" : ""}
              `}
            >
              <span className="text-xs">{cell.day}</span>
              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${typeColors[ev.type] || "bg-gray-400"} ${isToday(cell.day) ? "bg-white/80" : ""}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming events */}
      {!compact && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Upcoming</p>
          <div className="space-y-2">
            {events
              .filter((e) => new Date(e.date) >= today)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 3)
              .map((ev, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[ev.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
