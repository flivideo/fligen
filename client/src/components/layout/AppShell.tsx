import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { MainContent } from './MainContent';
import { ConfigModal } from '../ui/ConfigModal';
import { useNavigation } from '../../hooks/useNavigation';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';

// Tool components
import { Day1Harness } from '../tools/Day1Harness';
import { DayPlaceholder } from '../tools/DayPlaceholder';

interface AppShellProps {
  isConnected: boolean;
  operationStatus?: 'idle' | 'generating' | 'error';
  activeApi?: string;
}

export function AppShell({
  isConnected,
  operationStatus = 'idle',
  activeApi,
}: AppShellProps) {
  const { currentDay, navigateTo, navigateNext, navigatePrev } = useNavigation();
  const { isCollapsed, toggle } = useSidebarState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useKeyboardNav({
    navigateTo,
    navigateNext,
    navigatePrev,
    openSettings: () => setIsSettingsOpen(true),
    closeModal: () => setIsSettingsOpen(false),
  });

  const renderTool = () => {
    switch (currentDay.day) {
      case 1:
        return <Day1Harness isConnected={isConnected} />;
      default:
        return <DayPlaceholder day={currentDay} />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-row bg-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentDay={currentDay}
        isCollapsed={isCollapsed}
        onNavigate={navigateTo}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          currentDay={currentDay}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={toggle}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Content */}
        <MainContent>{renderTool()}</MainContent>

        {/* Status Bar */}
        <StatusBar
          isConnected={isConnected}
          operationStatus={operationStatus}
          activeApi={activeApi}
        />
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
