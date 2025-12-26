import { DAYS, type DayTool } from '../../data/days';
import { useSettings } from '../../contexts/SettingsContext';

interface SidebarProps {
  currentDay: DayTool;
  isCollapsed: boolean;
  onNavigate: (day: number) => void;
}

function StatusIcon({ status }: { status: DayTool['status'] }) {
  switch (status) {
    case 'complete':
      return <span className="text-green-400">✓</span>;
    case 'active':
      return <span className="text-blue-400">●</span>;
    case 'next':
      return <span className="text-yellow-400">▶</span>;
    case 'pending':
    default:
      return <span className="text-slate-500">○</span>;
  }
}

export function Sidebar({ currentDay, isCollapsed, onNavigate }: SidebarProps) {
  const { showDayIcons } = useSettings();

  return (
    <aside
      className="bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 h-full transition-all duration-200"
      style={{
        width: isCollapsed ? '48px' : '200px',
      }}
      role="navigation"
      aria-label="Day navigation"
    >
      <nav className="flex-1 py-2 overflow-y-auto flex flex-col">
        {DAYS.map((day) => {
          const isActive = currentDay.day === day.day;
          return (
            <button
              key={day.day}
              onClick={() => onNavigate(day.day)}
              className={`
                w-full flex flex-row items-center gap-2 px-3 py-2 text-left transition-colors
                ${isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
              title={`Day ${day.day}: ${day.name}`}
            >
              {showDayIcons && (
                <span className="text-lg shrink-0" role="img" aria-hidden="true">
                  {day.icon}
                </span>
              )}
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-sm">
                    Day {day.day} - {day.shortName}
                  </span>
                  <StatusIcon status={day.status} />
                </>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
