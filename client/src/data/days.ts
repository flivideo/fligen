// Re-export from shared package
export { DAYS, type DayTool } from '@fligen/shared';

import { DAYS } from '@fligen/shared';

export function getDayByRoute(hash: string) {
  return DAYS.find((day) => day.route === hash);
}

export function getDayByNumber(dayNumber: number) {
  return DAYS.find((day) => day.day === dayNumber);
}
