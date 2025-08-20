import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * WorkPackagesService
 * Infrastructure class that wraps OpenProject Work Packages API operations
 * and exposes them to tests. Uses Playwright APIRequestContext for HTTP calls.
 */
export default class WorkPackagesService {
  private request: APIRequestContext;
  private basePath = '/api/v3';

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  // Helper to build query params for Playwright request methods
  private buildParams(params?: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    if (!params) return out;
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        out[k] = JSON.stringify(v);
      } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out[k] = String(v);
      } else {
        // skip unsupported types (symbol, function, bigint); avoid accidental [object Object]
        continue;
      }
    }
    return out;
  }

  // List all work packages (global)
  async listWorkPackages(options?: { filters?: unknown; pageSize?: number; offset?: number; sortBy?: unknown }): Promise<APIResponse> {
    const params = this.buildParams(options as Record<string, unknown> | undefined);
    const res = await this.request.get(`${this.basePath}/work_packages`, { params, headers: { Accept: 'application/hal+json' } });
    return res;
  }

  // Create a global work package
  async createWorkPackage(body: Record<string, unknown>): Promise<APIResponse> {
    const res = await this.request.post(`${this.basePath}/work_packages`, {
      data: body,
      headers: { 'Content-Type': 'application/json', Accept: 'application/hal+json' },
    });
    return res;
  }

  // Get create form (global)
  async getCreateForm(): Promise<APIResponse> {
    const res = await this.request.post(`${this.basePath}/work_packages/form`, { headers: { Accept: 'application/hal+json' } });
    return res;
  }

  // List work package schemas
  async listWorkPackageSchemas(filters?: unknown): Promise<APIResponse> {
    const params = this.buildParams({ filters } as Record<string, unknown>);
    const res = await this.request.get(`${this.basePath}/work_packages/schemas`, { params, headers: { Accept: 'application/hal+json' } });
    return res;
  }

  // Work package by id
  async getWorkPackage(id: number): Promise<APIResponse> {
    const res = await this.request.get(`${this.basePath}/work_packages/${id}`, { headers: { Accept: 'application/hal+json' } });
    return res;
  }

  async updateWorkPackage(id: number, body: Record<string, unknown>): Promise<APIResponse> {
    const res = await this.request.patch(`${this.basePath}/work_packages/${id}`, {
      data: body,
      headers: { 'Content-Type': 'application/json', Accept: 'application/hal+json' },
    });
    return res;
  }

  async deleteWorkPackage(id: number): Promise<APIResponse> {
    const res = await this.request.delete(`${this.basePath}/work_packages/${id}`, { headers: { Accept: 'application/hal+json' } });
    return res;
  }

  // Project-scoped operations
  async listProjectWorkPackages(projectId: number, options?: { filters?: unknown; pageSize?: number; offset?: number; sortBy?: unknown }): Promise<APIResponse> {
    const params = this.buildParams(options as Record<string, unknown> | undefined);
    const res = await this.request.get(`${this.basePath}/projects/${projectId}/work_packages`, { params, headers: { Accept: 'application/hal+json' } });
    return res;
  }

  async createProjectWorkPackage(projectId: number, body: Record<string, unknown>): Promise<APIResponse> {
    const res = await this.request.post(`${this.basePath}/projects/${projectId}/work_packages`, {
      data: body,
      headers: { 'Content-Type': 'application/json', Accept: 'application/hal+json' },
    });
    return res;
  }

  async getProjectCreateForm(projectId: number): Promise<APIResponse> {
    const res = await this.request.post(`${this.basePath}/projects/${projectId}/work_packages/form`, { headers: { Accept: 'application/hal+json' } });
    return res;
  }

  // Availability helpers
  async availableProjectsForWorkPackage(id: number): Promise<APIResponse> {
    const res = await this.request.get(`${this.basePath}/work_packages/${id}/available_projects`, { headers: { Accept: 'application/hal+json' } });
    return res;
  }

  async availableRelationCandidates(id: number, options?: { pageSize?: number; filters?: unknown }): Promise<APIResponse> {
    const params = this.buildParams(options as Record<string, unknown> | undefined);
    const res = await this.request.get(`${this.basePath}/work_packages/${id}/available_relation_candidates`, { params, headers: { Accept: 'application/hal+json' } });
    return res;
  }

}
