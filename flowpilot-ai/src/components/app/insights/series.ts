import { isoWeekOf } from "@/domain/parse";
import type { Metrics } from "@/server/services/queries";
import type { LineDatum, WeekDatum } from "../charts";

/** Synthetic history weeks followed by the current, measured week. */
export function weeklySeries(m: Metrics, weekPrefix: string): { bars: WeekDatum[]; hours: LineDatum[]; liveHours: number; liveLabel: string } {
  const label = (iso: string) => `${weekPrefix} ${isoWeekOf(iso).week}`;
  const rows = [
    ...m.history.map((h) => ({ key: h.weekStart, label: label(h.weekStart), automated: h.automated, reviewed: h.reviewed, hours: h.hoursFreed, synthetic: h.synthetic })),
    {
      key: m.currentWeek.weekStart,
      label: label(m.currentWeek.weekStart),
      automated: m.currentWeek.automated,
      reviewed: m.currentWeek.reviewed,
      hours: m.currentWeek.hoursFreed,
      synthetic: false,
    },
  ];
  return {
    bars: rows.map((r) => ({ key: r.key, label: r.label, automated: r.automated, reviewed: r.reviewed, synthetic: r.synthetic })),
    // The current week is only a partial demo session; it is reported next to the line instead of
    // being connected to the full synthetic weeks (which would suggest a collapse).
    hours: rows.filter((r) => r.synthetic).map((r) => ({ key: r.key, label: r.label, value: Math.max(0, r.hours), synthetic: true })),
    liveHours: Math.max(0, m.currentWeek.hoursFreed),
    liveLabel: label(m.currentWeek.weekStart),
  };
}
