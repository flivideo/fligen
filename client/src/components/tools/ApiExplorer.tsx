import { useState, useMemo } from 'react';
import {
  API_ENDPOINTS,
  getEndpointGroups,
  type ApiEndpoint,
  type ApiParameter,
  type HttpMethod,
} from '@fligen/shared';

const API_BASE_URL = 'http://localhost:5401';

interface ParamValues {
  [key: string]: any;
}

interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  error?: string;
}

export default function ApiExplorer() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const endpointGroups = useMemo(() => getEndpointGroups(), []);

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  const selectEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    setCopiedCurl(null);
    // Set default values
    const defaults: ParamValues = {};
    endpoint.parameters.forEach((param) => {
      if (param.enum && param.enum.length > 0) {
        // Pre-select first enum value
        defaults[param.name] = param.enum[0];
      } else if (param.dataType === 'boolean') {
        // Default booleans to false
        defaults[param.name] = false;
      } else if (param.required && param.example !== undefined) {
        // Only pre-fill required parameters with example values
        defaults[param.name] = param.example;
      } else {
        // Optional parameters start empty (example shown as placeholder only)
        defaults[param.name] = '';
      }
    });
    setParamValues(defaults);
  };

  const updateParam = (name: string, value: any) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const buildUrl = () => {
    if (!selectedEndpoint) return '';

    let url = selectedEndpoint.path;
    const queryParams: string[] = [];

    // Replace path parameters
    selectedEndpoint.parameters
      .filter((p) => p.type === 'path')
      .forEach((param) => {
        const value = paramValues[param.name];
        if (value) {
          url = url.replace(`:${param.name}`, encodeURIComponent(value));
        }
      });

    // Add query parameters
    selectedEndpoint.parameters
      .filter((p) => p.type === 'query')
      .forEach((param) => {
        const value = paramValues[param.name];
        if (value !== '' && value !== undefined) {
          queryParams.push(`${param.name}=${encodeURIComponent(value)}`);
        }
      });

    const fullUrl = `${API_BASE_URL}${url}`;
    return queryParams.length > 0 ? `${fullUrl}?${queryParams.join('&')}` : fullUrl;
  };

  const buildRequestBody = () => {
    if (!selectedEndpoint) return null;

    const bodyParams = selectedEndpoint.parameters.filter((p) => p.type === 'body');
    if (bodyParams.length === 0) return null;

    const body: any = {};
    bodyParams.forEach((param) => {
      const value = paramValues[param.name];
      if (value !== '' && value !== undefined) {
        // Parse JSON arrays/objects if needed
        if (param.dataType === 'array' || param.dataType === 'object') {
          try {
            body[param.name] = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            body[param.name] = value;
          }
        } else {
          body[param.name] = value;
        }
      }
    });
    return Object.keys(body).length > 0 ? body : null;
  };

  const executeRequest = async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const url = buildUrl();
      const body = buildRequestBody();

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
      });
    } catch (error: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        data: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyAsCurl = () => {
    if (!selectedEndpoint) return;

    const url = buildUrl();
    const body = buildRequestBody();

    let curl = `curl -X ${selectedEndpoint.method} '${url}'`;

    if (body) {
      curl += ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }

    navigator.clipboard.writeText(curl);
    setCopiedCurl(curl);
  };

  const copyResponse = () => {
    if (!response) return;
    const text =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    navigator.clipboard.writeText(text);
  };

  const getMethodColor = (method: HttpMethod): string => {
    switch (method) {
      case 'GET':
        return 'text-green-600';
      case 'POST':
        return 'text-blue-600';
      case 'PUT':
        return 'text-yellow-600';
      case 'PATCH':
        return 'text-orange-600';
      case 'DELETE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMethodBg = (method: HttpMethod): string => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-700';
      case 'POST':
        return 'bg-blue-100 text-blue-700';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-700';
      case 'PATCH':
        return 'bg-orange-100 text-orange-700';
      case 'DELETE':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderParameterInput = (param: ApiParameter) => {
    const value = paramValues[param.name] || '';

    if (param.enum) {
      return (
        <select
          value={value}
          onChange={(e) => updateParam(param.name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select --</option>
          {param.enum.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (param.dataType === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => updateParam(param.name, e.target.checked)}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      );
    }

    if (param.dataType === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => updateParam(param.name, e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={param.example?.toString() || ''}
        />
      );
    }

    if (param.dataType === 'object' || param.dataType === 'array') {
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => updateParam(param.name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          rows={4}
          placeholder={param.example ? JSON.stringify(param.example, null, 2) : '{}'}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => updateParam(param.name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={param.example?.toString() || ''}
      />
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Panel: Endpoint List */}
      <div className="w-80 border border-gray-300 rounded-lg overflow-y-auto bg-white">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-300 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Endpoints</h2>
          <p className="text-xs text-gray-600 mt-1">{API_ENDPOINTS.length} total</p>
        </div>

        <div className="p-2">
          {Array.from(endpointGroups.entries()).map(([groupName, endpoints]) => {
            const isCollapsed = collapsedGroups.has(groupName);

            return (
              <div key={groupName} className="mb-2">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="text-gray-500">{isCollapsed ? '▶' : '▼'}</span>
                  <span>{groupName}</span>
                  <span className="ml-auto text-xs text-gray-500">({endpoints.length})</span>
                </button>

                {/* Endpoint List */}
                {!isCollapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {endpoints.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => selectEndpoint(endpoint)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          selectedEndpoint?.id === endpoint.id
                            ? 'bg-blue-100 border border-blue-300'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${getMethodColor(endpoint.method)}`}
                          >
                            {endpoint.method}
                          </span>
                          <span className="text-sm text-gray-700 truncate">
                            {endpoint.path.split('/').slice(3).join('/')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Request Builder & Response */}
      <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto bg-white">
        {selectedEndpoint ? (
          <div className="p-6">
            {/* Endpoint Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 rounded-md font-semibold text-sm ${getMethodBg(selectedEndpoint.method)}`}
                >
                  {selectedEndpoint.method}
                </span>
                <code className="text-lg text-gray-800">{selectedEndpoint.path}</code>
              </div>
              <p className="text-gray-600">{selectedEndpoint.description}</p>
              {selectedEndpoint.notes && (
                <p className="text-sm text-gray-500 mt-2 italic">{selectedEndpoint.notes}</p>
              )}
            </div>

            {/* Parameters */}
            {selectedEndpoint.parameters.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Parameters</h3>
                <div className="space-y-4">
                  {selectedEndpoint.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="block mb-1">
                        <span className="text-sm font-medium text-gray-700">{param.name}</span>
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                        <span className="ml-2 text-xs text-gray-500">
                          ({param.type}) {param.dataType}
                        </span>
                      </label>
                      {param.description && (
                        <p className="text-xs text-gray-600 mb-2">{param.description}</p>
                      )}
                      {renderParameterInput(param)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mb-6">
              <div className="flex gap-3 mb-3">
                <button
                  onClick={executeRequest}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send Request'}
                </button>
                <button
                  onClick={copyAsCurl}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
                >
                  Copy as cURL
                </button>
              </div>

              {/* Show copied curl command */}
              {copiedCurl && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-xs text-green-600 font-medium mb-1">Copied to clipboard:</p>
                  <pre className="text-sm text-green-700 font-mono whitespace-pre-wrap break-all">
                    {copiedCurl}
                  </pre>
                </div>
              )}
            </div>

            {/* Response Section */}
            {response && (
              <div className="border-t border-gray-300 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Response</h3>
                  <button
                    onClick={copyResponse}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Copy Response
                  </button>
                </div>

                {/* Status */}
                <div className="mb-3">
                  <span
                    className={`px-3 py-1 rounded-md font-semibold text-sm ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-100 text-green-700'
                        : response.status >= 400
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                </div>

                {/* Response Body */}
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4 overflow-x-auto">
                  {response.error ? (
                    <div className="text-red-600 font-medium">{response.error}</div>
                  ) : (
                    <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                      {typeof response.data === 'string'
                        ? response.data
                        : JSON.stringify(response.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Example Response */}
            {!response && selectedEndpoint.exampleResponse && (
              <div className="border-t border-gray-300 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Example Response</h3>
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-600 font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedEndpoint.exampleResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select an endpoint to begin</p>
              <p className="text-sm">Choose from {API_ENDPOINTS.length} available endpoints</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
