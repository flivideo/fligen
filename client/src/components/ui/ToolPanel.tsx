import type { ReactNode } from 'react';

interface ToolPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ToolPanel({ title, children, className = '' }: ToolPanelProps) {
  return (
    <div
      className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`}
    >
      <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface TwoPanelLayoutProps {
  inputPanel: ReactNode;
  outputPanel: ReactNode;
  inputTitle?: string;
  outputTitle?: string;
}

export function TwoPanelLayout({
  inputPanel,
  outputPanel,
  inputTitle = 'Input',
  outputTitle = 'Output',
}: TwoPanelLayoutProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <ToolPanel title={inputTitle} className="flex-shrink-0">
        {inputPanel}
      </ToolPanel>
      <ToolPanel title={outputTitle} className="flex-1 min-h-0">
        {outputPanel}
      </ToolPanel>
    </div>
  );
}
