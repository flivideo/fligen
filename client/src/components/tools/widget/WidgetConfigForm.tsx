import { WidgetParam } from '@fligen/shared';

interface WidgetConfigFormProps {
  params: WidgetParam[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

/**
 * Dynamic configuration form based on template parameters
 */
export function WidgetConfigForm({ params, values, onChange }: WidgetConfigFormProps) {
  const renderField = (param: WidgetParam) => {
    const value = values[param.key] ?? param.default;

    switch (param.type) {
      case 'text':
      case 'url':
        return (
          <input
            type={param.type}
            value={value}
            onChange={(e) => onChange(param.key, e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            required={param.required}
            placeholder={param.label}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(param.key, e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            required={param.required}
            placeholder={param.label}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(param.key, parseInt(e.target.value) || 0)}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            required={param.required}
            min={param.validation?.min}
            max={param.validation?.max}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(param.key, e.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
            <span className="text-sm text-slate-300">{param.label}</span>
          </label>
        );

      case 'radio':
        return (
          <div className="flex gap-4">
            {param.options?.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={param.key}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(param.key, e.target.value)}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm capitalize text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return <div className="text-sm text-slate-500">Unsupported field type: {param.type}</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-300">Configuration</div>

      {params.map((param) => (
        <div key={param.key} className="space-y-1">
          {param.type !== 'checkbox' && (
            <label className="block text-sm text-slate-400">
              {param.label}
              {param.required && <span className="text-red-400"> *</span>}
            </label>
          )}
          {renderField(param)}
        </div>
      ))}
    </div>
  );
}
