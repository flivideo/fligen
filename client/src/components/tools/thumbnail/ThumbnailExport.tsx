import { useState } from 'react';
import { renderToCanvas } from './ThumbnailCanvas';
import type { ThumbnailConfig, LayerVisibility } from './types';

// ============================================
// Action Bar Component
// ============================================

interface ActionBarProps {
  onReset: () => void;
  onExport: () => void;
  onCopyToClipboard: () => void;
  onSave: () => void;
  isExporting: boolean;
  isSaving: boolean;
}

function ActionBar({ onReset, onExport, onCopyToClipboard, onSave, isExporting, isSaving }: ActionBarProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onReset}
        disabled={isExporting || isSaving}
        className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        Reset
      </button>
      <button
        onClick={onCopyToClipboard}
        disabled={isExporting || isSaving}
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
        onClick={onSave}
        disabled={isExporting || isSaving}
        className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <span className="animate-pulse">Saving...</span>
        ) : (
          <span>Save to Catalog</span>
        )}
      </button>
      <button
        onClick={onExport}
        disabled={isExporting || isSaving}
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
  onSave?: () => void;
}

export function ThumbnailExport({
  config,
  visibility,
  isExporting,
  setIsExporting,
  onReset,
  onSave,
}: ThumbnailExportProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvas = await renderToCanvas(config, visibility);
      const imageDataUrl = canvas.toDataURL('image/png');
      const res = await fetch('http://localhost:5401/api/thumbnail/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl, config, label: 'Saved thumbnail' }),
      });
      if (!res.ok) {
        throw new Error(`Save failed: ${res.status} ${res.statusText}`);
      }
      onSave?.();
    } catch (error) {
      console.error('Save to catalog failed:', error);
      alert('Failed to save to catalog. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(config, visibility);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      });

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
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
      onSave={handleSave}
      isExporting={isExporting}
      isSaving={isSaving}
    />
  );
}
