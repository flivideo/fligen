import { useState, useCallback } from 'react';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  width: number;
  height: number;
  ratio: string;
  decimal: number;
}

export interface Preset {
  label: string;
  ratioW: number;
  ratioH: number;
}

export interface Resolution {
  label: string;
  width: number;
  height: number;
  ratio: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function calcHeight(width: number, ratioW: number, ratioH: number): number {
  return Math.round((width * ratioH) / ratioW);
}

export function calcWidth(height: number, ratioW: number, ratioH: number): number {
  return Math.round((height * ratioW) / ratioH);
}

export function dimsToRatio(width: number, height: number): { ratio: string; decimal: number } {
  if (!width || !height) return { ratio: 'N/A', decimal: 0 };
  const d = gcd(width, height);
  return { ratio: `${width / d}:${height / d}`, decimal: parseFloat((width / height).toFixed(3)) };
}

const HISTORY_KEY = 'fligen-aspect-ratio-history';
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

export function useCalculator() {
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [ratioW, setRatioW] = useState<number>(16);
  const [ratioH, setRatioH] = useState<number>(9);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [activePreset, setActivePreset] = useState<string | null>('16:9');

  const addToHistory = useCallback((w: number, h: number) => {
    const { ratio, decimal } = dimsToRatio(w, h);
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      width: w,
      height: h,
      ratio,
      decimal,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const calculate = useCallback(() => {
    addToHistory(width, height);
  }, [width, height, addToHistory]);

  const swapDimensions = useCallback(() => {
    setWidth(height);
    setHeight(width);
    setRatioW(ratioH);
    setRatioH(ratioW);
  }, [width, height, ratioW, ratioH]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setWidth(entry.width);
    setHeight(entry.height);
    const d = gcd(entry.width, entry.height);
    setRatioW(entry.width / d);
    setRatioH(entry.height / d);
  }, []);

  const applyPreset = useCallback((rw: number, rh: number, label: string) => {
    setRatioW(rw);
    setRatioH(rh);
    setHeight(calcHeight(width, rw, rh));
    setActivePreset(label);
  }, [width]);

  const applyResolution = useCallback((w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    const d = gcd(w, h);
    setRatioW(w / d);
    setRatioH(h / d);
    setActivePreset(null);
  }, []);

  const computedRatio = dimsToRatio(width, height);

  return {
    width, setWidth,
    height, setHeight,
    ratioW, setRatioW,
    ratioH, setRatioH,
    computedRatio,
    history,
    activePreset,
    calculate,
    swapDimensions,
    clearHistory,
    restoreFromHistory,
    applyPreset,
    applyResolution,
  };
}
