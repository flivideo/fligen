import type { DayTool } from '../../data/days';
import { TwoPanelLayout } from '../ui/ToolPanel';

interface DayPlaceholderProps {
  day: DayTool;
}

export function DayPlaceholder({ day }: DayPlaceholderProps) {
  return (
    <div className="h-full">
      <TwoPanelLayout
        inputTitle="Input"
        outputTitle="Output"
        inputPanel={
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{day.icon}</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Day {day.day}: {day.name}
            </h2>
            <p className="text-slate-400">
              {day.status === 'pending'
                ? 'Coming soon...'
                : day.status === 'active'
                ? 'In development'
                : 'Complete'}
            </p>
          </div>
        }
        outputPanel={
          <div className="flex items-center justify-center h-full min-h-[200px] text-slate-500">
            <p>Output will appear here</p>
          </div>
        }
      />
    </div>
  );
}
