interface StatusBarProps {
  isConnected: boolean;
  operationStatus: 'idle' | 'generating' | 'error';
  activeApi?: string;
}

export function StatusBar({
  isConnected,
  operationStatus,
  activeApi,
}: StatusBarProps) {
  return (
    <footer
      className="h-8 shrink-0 bg-slate-800 border-t border-slate-700 flex flex-row items-center px-4 text-xs"
      role="status"
      aria-live="polite"
    >
      {/* Connection Status */}
      <div className="flex flex-row items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
          aria-hidden="true"
        />
        <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <span className="mx-3 text-slate-500">│</span>

      {/* Operation Status */}
      <div className="flex flex-row items-center gap-2">
        <span
          className={
            operationStatus === 'idle'
              ? 'text-slate-400'
              : operationStatus === 'generating'
              ? 'text-yellow-400'
              : 'text-red-400'
          }
        >
          {operationStatus === 'idle'
            ? 'Idle'
            : operationStatus === 'generating'
            ? 'Generating...'
            : 'Error'}
        </span>
      </div>

      {/* Active API */}
      {activeApi && (
        <>
          <span className="mx-3 text-slate-500">│</span>
          <span className="text-slate-500">{activeApi}</span>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Keyboard hints */}
      <div className="hidden md:flex flex-row items-center gap-3 text-slate-500">
        <span>⌘1-9 Days</span>
        <span>⌘[ ] Nav</span>
        <span>⌘, Settings</span>
      </div>
    </footer>
  );
}
