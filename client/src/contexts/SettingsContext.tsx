import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { SETTINGS } from '@fligen/shared';

export type SettingsValues = Record<string, string | boolean>;

const STORAGE_KEY = 'fligen-config';

function getDefaultValues(): SettingsValues {
  const defaults: SettingsValues = {};
  for (const setting of SETTINGS) {
    if (setting.type === 'toggle') {
      defaults[setting.name] = setting.defaultValue;
    } else {
      defaults[setting.name] = '';
    }
  }
  return defaults;
}

function loadSettings(): SettingsValues {
  const defaults = getDefaultValues();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return defaults;
}

function saveSettings(values: SettingsValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

interface SettingsContextType {
  values: SettingsValues;
  updateValue: (name: string, value: string | boolean) => void;
  reload: () => void;
  save: (newValues: SettingsValues) => void;
  showDayIcons: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<SettingsValues>(loadSettings);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setValues(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateValue = useCallback((name: string, value: string | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const reload = useCallback(() => {
    setValues(loadSettings());
  }, []);

  const save = useCallback((newValues: SettingsValues) => {
    setValues(newValues);
    saveSettings(newValues);
  }, []);

  const contextValue: SettingsContextType = {
    values,
    updateValue,
    reload,
    save,
    showDayIcons: values.showDayIcons as boolean,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
