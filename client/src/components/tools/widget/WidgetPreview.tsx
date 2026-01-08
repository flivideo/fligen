import { useEffect, useRef } from 'react';

interface WidgetPreviewProps {
  html: string;
}

/**
 * Live widget preview using iframe with srcdoc
 */
export function WidgetPreview({ html }: WidgetPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Refresh iframe when HTML changes
    if (iframeRef.current) {
      // Force iframe to reload srcdoc
      iframeRef.current.srcdoc = html;
    }
  }, [html]);

  return (
    <div className="flex h-full items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-2 text-sm text-slate-400">Live Preview</div>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Widget Preview"
          className="h-[500px] w-full rounded-lg border border-slate-700 bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
