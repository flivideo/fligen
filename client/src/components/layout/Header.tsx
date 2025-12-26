import type { DayTool } from '../../data/days';

interface HeaderProps {
  currentDay: DayTool;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export function Header({
  currentDay,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header
      className="h-12 shrink-0 bg-slate-800 border-b border-slate-700 flex flex-row items-center justify-between px-4"
    >
      {/* Left: Breadcrumb */}
      <div className="flex flex-row items-center gap-2">
        <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">FliGen</span>
        <span className="text-slate-500">&rsaquo;</span>
        <span className="text-slate-400">
          Day {currentDay.day} - {currentDay.name}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-row items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Settings (Ctrl/Cmd + ,)"
          aria-label="Open settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
