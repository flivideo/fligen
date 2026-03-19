import { renderToCanvas } from './ThumbnailCanvas';
import type { ThumbnailConfig, LayerVisibility } from './types';

// ============================================
// Action Bar Component
// ============================================

interface ActionBarProps {
  onReset: () => void;
  onExport: () => void;
  onCopyToClipboard: () => void;
  isExporting: boolean;
}

function ActionBar({ onReset, onExport, onCopyToClipboard, isExporting }: ActionBarProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onReset}
        disabled={isExporting}
        className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        Reset
      </button>
      <button
        onClick={onCopyToClipboard}
        disabled={isExporting}
        className="flex-1 py-2.5 px-4 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isExporting ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          <>
            <span>📋</span>
            <span>Copy to Clipboard</span>
          </>
        )}
      </button>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
      >
        Export PNG
      </button>
    </div>
  );
}

// ============================================
// ThumbnailExport Component
// ============================================

export interface ThumbnailExportProps {
  config: ThumbnailConfig;
  visibility: LayerVisibility;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  onReset: () => void;
}

export function ThumbnailExport({
  config,
  visibility,
  isExporting,
  setIsExporting,
  onReset,
}: ThumbnailExportProps) {
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(config, visibility);

      // TODO FR-19: fix toBlob race on unmount
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `thumbnail-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(config, visibility);

      // TODO FR-19: fix toBlob race on unmount
      // Convert to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            // Brief visual feedback could be added here
          } catch (clipboardError) {
            console.error('Clipboard write failed:', clipboardError);
            alert('Failed to copy to clipboard. Your browser may not support this feature.');
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert('Failed to copy to clipboard. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ActionBar
      onReset={onReset}
      onExport={handleExport}
      onCopyToClipboard={handleCopyToClipboard}
      isExporting={isExporting}
    />
  );
}
