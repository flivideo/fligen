import { useState, useEffect } from 'react';
import { WidgetTemplate, WidgetConfig } from '@fligen/shared';
import { ToolPanel } from '../ui/ToolPanel';
import { WidgetPreview } from './widget/WidgetPreview';
import { WidgetTemplateSelector } from './widget/WidgetTemplateSelector';
import { WidgetConfigForm } from './widget/WidgetConfigForm';
import { WidgetHistory } from './widget/WidgetHistory';

const API_BASE = 'http://localhost:5401';

/**
 * Day 14: Widget Generator
 * Create branded HTML widgets for social media posts and graphics
 */
export function Day14Widget() {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    loadWidgets();
  }, []);

  // Generate preview HTML when params or template changes
  useEffect(() => {
    if (selectedTemplate) {
      generatePreview();
    }
  }, [params, selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/widget-templates`);
      const data = await res.json();
      setTemplates(data.templates);

      // Auto-select first template and initialize params
      if (data.templates.length > 0) {
        const template = data.templates[0];
        setSelectedTemplate(template);
        initializeParams(template);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadWidgets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/widgets`);
      const data = await res.json();
      setWidgets(data.widgets);
    } catch (error) {
      console.error('Failed to load widgets:', error);
    }
  };

  const initializeParams = (template: WidgetTemplate) => {
    const initialParams: Record<string, any> = {};
    template.params.forEach((param) => {
      initialParams[param.key] = param.default;
    });
    setParams(initialParams);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      initializeParams(template);
    }
  };

  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const generatePreview = async () => {
    if (!selectedTemplate) return;

    try {
      // Call backend to render HTML
      const res = await fetch(`${API_BASE}/api/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate.id,
          params,
        }),
      });

      if (!res.ok) {
        console.error('Failed to generate preview');
        return;
      }

      const data = await res.json();

      // Fetch the generated HTML
      const htmlRes = await fetch(`${API_BASE}${data.htmlPath}`);
      const html = await htmlRes.text();
      setPreviewHtml(html);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const handleExport = async () => {
    if (!selectedTemplate || !previewHtml) return;

    setIsExporting(true);

    try {
      // Save widget to server (already done in generatePreview, but ensure latest)
      const res = await fetch(`${API_BASE}/api/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate.id,
          params,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save widget');
      }

      const data = await res.json();

      // Fetch the HTML file
      const htmlRes = await fetch(`${API_BASE}${data.htmlPath}`);
      const html = await htmlRes.text();

      // Trigger download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename with preview text
      const preview = data.preview.substring(0, 30).replace(/[^a-z0-9]/gi, '-');
      a.download = `widget-${preview}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Reload widgets to show new widget in history
      await loadWidgets();

      alert('Widget exported successfully!');
    } catch (error) {
      console.error('Failed to export widget:', error);
      alert('Failed to export widget');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReuse = (config: WidgetConfig) => {
    // Switch to the widget's template
    const template = templates.find((t) => t.id === config.template);
    if (template) {
      setSelectedTemplate(template);
      setParams(config.params);
      setShowHistory(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/widgets/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete widget');
      }

      await loadWidgets();
    } catch (error) {
      console.error('Failed to delete widget:', error);
      alert('Failed to delete widget');
    }
  };

  return (
    <ToolPanel
      title="Widget Generator"
      description="Create social media widgets and branded graphics"
    >
      <div className="flex h-full">
        {/* Left: Preview */}
        <div className="flex-1">
          {previewHtml ? (
            <WidgetPreview html={previewHtml} />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              Select a template to start
            </div>
          )}

          {/* Action Bar */}
          <div className="border-t border-slate-700 bg-slate-800 p-4">
            <div className="flex gap-3">
              <button
                onClick={() => setShowHistory(true)}
                className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                History ({widgets.length})
              </button>
              <button
                onClick={handleExport}
                disabled={!previewHtml || isExporting}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Export HTML'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Configuration Panel */}
        <div className="w-96 overflow-y-auto border-l border-slate-700 bg-slate-800 p-4">
          <div className="space-y-6">
            {/* Template Selector */}
            <WidgetTemplateSelector
              templates={templates}
              selectedId={selectedTemplate?.id || ''}
              onSelect={handleTemplateChange}
            />

            {/* Configuration Form */}
            {selectedTemplate && (
              <WidgetConfigForm
                params={selectedTemplate.params}
                values={params}
                onChange={handleParamChange}
              />
            )}
          </div>
        </div>

        {/* History Sidebar (Overlay) */}
        {showHistory && (
          <WidgetHistory
            widgets={widgets}
            onReuse={handleReuse}
            onDelete={handleDelete}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    </ToolPanel>
  );
}
