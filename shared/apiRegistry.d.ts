/**
 * API Registry
 * Metadata for all FliGen REST API endpoints
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ParameterType = 'path' | 'query' | 'body';
export type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export interface ApiParameter {
    name: string;
    type: ParameterType;
    dataType: DataType;
    description?: string;
    required?: boolean;
    enum?: string[];
    example?: any;
    properties?: ApiParameter[];
}
export interface ApiEndpoint {
    id: string;
    method: HttpMethod;
    path: string;
    group: string;
    description: string;
    parameters: ApiParameter[];
    exampleResponse?: any;
    notes?: string;
}
/**
 * API Endpoint Registry
 * Grouped by functional area
 */
export declare const API_ENDPOINTS: ApiEndpoint[];
/**
 * Group endpoints by category
 */
export declare function getEndpointGroups(): Map<string, ApiEndpoint[]>;
/**
 * Get endpoint by ID
 */
export declare function getEndpointById(id: string): ApiEndpoint | undefined;
//# sourceMappingURL=apiRegistry.d.ts.map