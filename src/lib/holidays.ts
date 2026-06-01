// US holiday presets. Dates are computed per year so they can be materialized
// as full-day schedule_blackouts.

export type HolidayPreset = {
  id: string;
  name: string;
  /** Returns YYYY-MM-DD for the given year. */
  dateFor: (year: number) => string;
};

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return fmt(year, month, day);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const last = new Date(Date.UTC(year, month, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return fmt(year, month, last.getUTCDate() - offset);
}

export const US_HOLIDAY_PRESETS: HolidayPreset[] = [
  { id: "new_years", name: "New Year's Day", dateFor: (y) => fmt(y, 1, 1) },
  { id: "mlk", name: "MLK Jr. Day", dateFor: (y) => nthWeekdayOfMonth(y, 1, 1, 3) },
  { id: "presidents", name: "Presidents' Day", dateFor: (y) => nthWeekdayOfMonth(y, 2, 1, 3) },
  { id: "memorial", name: "Memorial Day", dateFor: (y) => lastWeekdayOfMonth(y, 5, 1) },
  { id: "juneteenth", name: "Juneteenth", dateFor: (y) => fmt(y, 6, 19) },
  { id: "independence", name: "Independence Day", dateFor: (y) => fmt(y, 7, 4) },
  { id: "labor", name: "Labor Day", dateFor: (y) => nthWeekdayOfMonth(y, 9, 1, 1) },
  { id: "columbus", name: "Columbus Day", dateFor: (y) => nthWeekdayOfMonth(y, 10, 1, 2) },
  { id: "veterans", name: "Veterans Day", dateFor: (y) => fmt(y, 11, 11) },
  { id: "thanksgiving", name: "Thanksgiving", dateFor: (y) => nthWeekdayOfMonth(y, 11, 4, 4) },
  { id: "day_after_thanksgiving", name: "Day after Thanksgiving", dateFor: (y) => nthWeekdayOfMonth(y, 11, 5, 4) },
  { id: "christmas_eve", name: "Christmas Eve", dateFor: (y) => fmt(y, 12, 24) },
  { id: "christmas", name: "Christmas Day", dateFor: (y) => fmt(y, 12, 25) },
  { id: "new_years_eve", name: "New Year's Eve", dateFor: (y) => fmt(y, 12, 31) },
];