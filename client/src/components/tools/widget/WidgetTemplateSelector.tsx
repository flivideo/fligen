import { WidgetTemplate } from '@fligen/shared';

interface WidgetTemplateSelectorProps {
  templates: WidgetTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Template selection UI with radio buttons
 */
export function WidgetTemplateSelector({
  templates,
  selectedId,
  onSelect,
}: WidgetTemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-300">Template Selection</div>

      <div className="space-y-2">
        {templates.map((template) => (
          <label
            key={template.id}
            className="flex cursor-pointer items-start gap-3 rounded border border-slate-700 bg-slate-800 p-3 transition-colors hover:border-slate-600"
          >
            <input
              type="radio"
              name="template"
              value={template.id}
              checked={selectedId === template.id}
              onChange={(e) => onSelect(e.target.value)}
              className="mt-1 h-4 w-4 accent-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-white">{template.name}</div>
              <div className="text-sm text-slate-400">{template.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
