import ApiExplorer from './ApiExplorer';

export function Day15ApiExplorer() {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-100">API Explorer</h1>
          <p className="text-slate-400">
            Interactive API documentation and testing. Explore all FliGen endpoints, try them out,
            and copy as cURL commands.
          </p>
        </div>
        <ApiExplorer />
      </div>
    </div>
  );
}
