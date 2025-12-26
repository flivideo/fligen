import { useEffect, useRef } from 'react';
import { SETTINGS } from '@fligen/shared';
import { useSettings } from '../../contexts/SettingsContext';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const toggleSettings = SETTINGS.filter((s) => s.type === 'toggle');
const passwordSettings = SETTINGS.filter((s) => s.type === 'password');

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { values, updateValue, reload, save } = useSettings();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      reload();
    } else {
      dialog.close();
    }
  }, [isOpen, reload]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleSave = () => {
    save(values);
    onClose();
  };

  const handleChange = (name: string, value: string | boolean) => {
    updateValue(name, value);
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={onClose}
      className="m-auto w-96 rounded-lg border border-slate-700 bg-slate-800 p-0 backdrop:bg-black/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Close settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Display Settings */}
        {toggleSettings.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Display</h3>
            <div className="space-y-2">
              {toggleSettings.map((setting) => (
                <label
                  key={setting.name}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(values[setting.name])}
                    onChange={(e) => handleChange(setting.name, e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-white">{setting.label}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* API Keys */}
        {passwordSettings.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-400 mb-3">API Keys</h3>
            <div className="space-y-3">
              {passwordSettings.map((setting) => (
                <div key={setting.name}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {setting.label}
                  </label>
                  <input
                    type="password"
                    value={(values[setting.name] as string) || ''}
                    onChange={(e) => handleChange(setting.name, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 rounded border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-400"
                    placeholder={setting.type === 'password' ? setting.placeholder : ''}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500">
          Settings are stored in your browser's local storage.
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
        >
          Save
        </button>
      </div>
    </dialog>
  );
}
