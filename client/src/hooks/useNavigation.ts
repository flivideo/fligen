import { useState, useEffect, useCallback } from 'react';
import { DAYS, getDayByRoute, type DayTool } from '../data/days';

export function useNavigation() {
  const [currentDay, setCurrentDay] = useState<DayTool>(() => {
    const hash = window.location.hash || '#day-1';
    return getDayByRoute(hash) || DAYS[0];
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#day-1';
      const day = getDayByRoute(hash);
      if (day) {
        setCurrentDay(day);
      }
    };

    // Set initial hash if not present
    if (!window.location.hash) {
      window.location.hash = '#day-1';
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = useCallback((dayNumber: number) => {
    const day = DAYS.find((d) => d.day === dayNumber);
    if (day) {
      window.location.hash = day.route;
    }
  }, []);

  const navigateNext = useCallback(() => {
    const nextDay = currentDay.day < 12 ? currentDay.day + 1 : 1;
    navigateTo(nextDay);
  }, [currentDay, navigateTo]);

  const navigatePrev = useCallback(() => {
    const prevDay = currentDay.day > 1 ? currentDay.day - 1 : 12;
    navigateTo(prevDay);
  }, [currentDay, navigateTo]);

  return {
    currentDay,
    navigateTo,
    navigateNext,
    navigatePrev,
    days: DAYS,
  };
}
