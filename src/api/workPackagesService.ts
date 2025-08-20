import { APIRequestContext } from '@playwright/test';

/**
 * OpenProjectClient
 * Client that exposes a fluent, resource-oriented API for OpenProject resources
 * (work packages, projects, boards, ...). Uses Playwright APIRequestContext for HTTP calls.
 */
export default class OpenProjectClient {
  constructor(private request: APIRequestContext) {}

  project(projectId: number | string) {
    return new ProjectResource(this.request, '/api/v3', String(projectId));
  }

  workPackage(id: number | string) {
    return new WorkPackageResource(this.request, '/api/v3', String(id));
  }

  workPackages() {
    return new GlobalWorkPackagesResource(this.request, '/api/v3');
  }
}

// Minimal reusable constants and helper for the fluent resources
const JSON_ACCEPT = { Accept: 'application/hal+json' };

function buildParams(params?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
      out[k] = JSON.stringify(v);
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    } else {
      continue;
    }
  }
  return out;
}

// Resource classes implementing the fluent style API
class ProjectResource {
  constructor(private request: APIRequestContext, private basePath: string, private projectId: string) {}

  workPackages() {
    return new WorkPackagesResource(this.request, this.basePath, this.projectId);
  }
}

class WorkPackagesResource {
  constructor(private request: APIRequestContext, private basePath: string, private projectId: string) {}

  async get(options?: { filters?: unknown; pageSize?: number; offset?: number; sortBy?: unknown }) {
    const params = buildParams(options as Record<string, unknown> | undefined);
    return await this.request.get(`${this.basePath}/projects/${this.projectId}/work_packages`, { params, headers: JSON_ACCEPT });
  }

  async post(body: Record<string, unknown>) {
    return await this.request.post(`${this.basePath}/projects/${this.projectId}/work_packages`, {
      data: body,
      headers: { 'Content-Type': 'application/json', ...JSON_ACCEPT },
    });
  }

  id(wpId: number | string) {
    return new WorkPackageResource(this.request, this.basePath, String(wpId));
  }
}

class WorkPackageResource {
  constructor(private request: APIRequestContext, private basePath: string, private id: string) {}

  async get() {
    return await this.request.get(`${this.basePath}/work_packages/${this.id}`, { headers: JSON_ACCEPT });
  }

  async patch(body: Record<string, unknown>) {
    return await this.request.patch(`${this.basePath}/work_packages/${this.id}`, {
      data: body,
      headers: { 'Content-Type': 'application/json', ...JSON_ACCEPT },
    });
  }

  async delete() {
    return await this.request.delete(`${this.basePath}/work_packages/${this.id}`, { headers: JSON_ACCEPT });
  }

  async availableProjects() {
    return await this.request.get(`${this.basePath}/work_packages/${this.id}/available_projects`, { headers: JSON_ACCEPT });
  }

  async availableRelationCandidates(options?: { pageSize?: number; filters?: unknown }) {
    const params = buildParams(options as Record<string, unknown> | undefined);
    return await this.request.get(`${this.basePath}/work_packages/${this.id}/available_relation_candidates`, { params, headers: JSON_ACCEPT });
  }
}

// Global collection resource for work packages (non-project scoped)
class GlobalWorkPackagesResource {
  constructor(private request: APIRequestContext, private basePath: string) {}

  async get(options?: { filters?: unknown; pageSize?: number; offset?: number; sortBy?: unknown }) {
    const params = buildParams(options as Record<string, unknown> | undefined);
    return await this.request.get(`${this.basePath}/work_packages`, { params, headers: JSON_ACCEPT });
  }

  async schemas(filters?: unknown) {
    // If filters is omitted or an empty array, don't send the `filters` query param.
    // Sending `filters=[]` causes the OpenProject API to return HTTP 500 in some versions.
    if (filters === undefined || (Array.isArray(filters) && filters.length === 0)) {
      return await this.request.get(`${this.basePath}/work_packages/schemas`, { headers: JSON_ACCEPT });
    }

    const params = buildParams({ filters } as Record<string, unknown>);
    return await this.request.get(`${this.basePath}/work_packages/schemas`, { params, headers: JSON_ACCEPT });
  }
}
