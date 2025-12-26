type StatusType = 'success' | 'warning' | 'error' | 'info';

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  showDot?: boolean;
}

const statusColors: Record<StatusType, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--text-secondary)',
};

export function StatusIndicator({
  status,
  label,
  showDot = true,
}: StatusIndicatorProps) {
  const color = statusColors[status];

  return (
    <div className="flex items-center gap-2">
      {showDot && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      <span style={{ color }}>{label}</span>
    </div>
  );
}
