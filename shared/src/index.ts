// Shared types for FliGen
import config from './config.json';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

export interface ServerConfig {
  port: number;
  clientUrl: string;
}

// Socket.io event types
export interface ServerToClientEvents {
  'connection:established': (data: { message: string }) => void;
  'agent:text': (data: { text: string }) => void;
  'agent:tool': (data: { name: string; input: unknown }) => void;
  'agent:tool_result': (data: { name: string; success: boolean }) => void;
  'agent:complete': (data: {
    sessionId: string;
    usage: { input: number; output: number };
    cost: number;
    duration: number;
  }) => void;
  'agent:error': (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  'agent:query': (data: { message: string }) => void;
  'agent:cancel': () => void;
}

// Day tool configuration
export interface DayTool {
  day: number;
  name: string;
  shortName: string;
  icon: string;
  status: 'pending' | 'active' | 'complete' | 'next';
  route: string;
  purpose?: string;
  apisTech?: string[];
}

// Settings configuration
export interface SettingConfigBase {
  name: string;
  label: string;
  type: string;
}

export interface PasswordSettingConfig extends SettingConfigBase {
  type: 'password';
  placeholder: string;
}

export interface ToggleSettingConfig extends SettingConfigBase {
  type: 'toggle';
  defaultValue: boolean;
}

export type SettingConfig = PasswordSettingConfig | ToggleSettingConfig;

// Config structure
export interface FliGenConfig {
  meta: {
    id: string;
    version: string;
    source: string;
    lastUpdated: string;
  };
  days: DayTool[];
  settings: SettingConfig[];
}

// Export config data
export const fliGenConfig = config as FliGenConfig;
export const DAYS = config.days as DayTool[];
export const SETTINGS = config.settings as SettingConfig[];
