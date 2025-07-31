#!/usr/bin/env node

/**
 * Sinch MCP Server
 * 
 * This MCP server provides comprehensive access to Sinch communication APIs:
 * - SMS: Send messages, get delivery reports, manage batches
 * - Numbers: Search, provision, and manage phone numbers
 * - Verification: Phone number and email verification
 * - Email: Send and manage email communications (via Conversation API)
 * 
 * Authentication is handled via Bearer tokens and service plan IDs.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

// Types for Sinch API responses
interface ProjectConfig {
  servicePlanId: string;
  apiToken: string;
  projectId?: string;
  appId?: string;
  clientId?: string;
  clientSecret?: string;
  region?: 'us' | 'eu' | 'au' | 'br' | 'ca';
  displayName?: string;
}

interface SinchConfig {
  // Legacy single-project support (for backward compatibility)
  servicePlanId?: string;
  apiToken?: string;
  projectId?: string;
  appId?: string;
  clientId?: string;
  clientSecret?: string;
  region?: 'us' | 'eu' | 'au' | 'br' | 'ca';
  parentProjects?: string[];
  
  // New multi-project configuration
  projects?: { [projectName: string]: ProjectConfig };
  defaultProject?: string;
}

interface SMSBatch {
  id: string;
  to: string[];
  from: string;
  body: string;
  created_at: string;
  delivery_report: string;
  expire_at?: string;
  flash_message?: boolean;
}

interface DeliveryReport {
  batch_id: string;
  total_message_count: number;
  statuses: Array<{
    code: number;
    count: number;
    recipients: string[];
    status: string;
  }>;
}

interface AvailableNumber {
  phoneNumber: string;
  regionCode: string;
  type: string;
  capability: string[];
  setupPrice: {
    currencyCode: string;
    amount: string;
  };
  monthlyPrice: {
    currencyCode: string;
    amount: string;
  };
}

interface VerificationRequest {
  id: string;
  method: 'sms' | 'flashcall' | 'callout';
  identity: {
    type: 'number';
    endpoint: string;
  };
  status: string;
}

class SinchAPIClient {
  private config: SinchConfig;

  constructor(config: SinchConfig) {
    this.config = config;
  }

  // Get project configuration by name or use default
  private getProjectConfig(projectName?: string): ProjectConfig {
    // If specific project requested
    if (projectName) {
      if (this.config.projects && this.config.projects[projectName]) {
        return this.config.projects[projectName];
      }
      throw new Error(`Project configuration '${projectName}' not found`);
    }

    // Try default project from multi-project config
    if (this.config.defaultProject && this.config.projects) {
      const defaultConfig = this.config.projects[this.config.defaultProject];
      if (defaultConfig) return defaultConfig;
    }

    // Fall back to legacy single-project config
    if (this.config.servicePlanId && this.config.apiToken) {
      return {
        servicePlanId: this.config.servicePlanId,
        apiToken: this.config.apiToken,
        projectId: this.config.projectId,
        appId: this.config.appId,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        region: this.config.region || 'us'
      };
    }

    throw new Error('No valid project configuration found. Either provide project name or configure default project.');
  }

  // Create API client for specific project
  private createSMSClient(projectConfig: ProjectConfig): AxiosInstance {
    const region = projectConfig.region || 'us';
    const smsBaseURL = `https://${region}.sms.api.sinch.com`;
    
    return axios.create({
      baseURL: smsBaseURL,
      headers: {
        'Authorization': `Bearer ${projectConfig.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private createNumbersClient(projectConfig: ProjectConfig): AxiosInstance {
    return axios.create({
      baseURL: 'https://numbers.api.sinch.com',
      headers: {
        'Authorization': `Bearer ${projectConfig.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private createVerificationClient(projectConfig: ProjectConfig): AxiosInstance {
    return axios.create({
      baseURL: 'https://verification.api.sinch.com',
      headers: {
        'Authorization': `Bearer ${projectConfig.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private createSubprojectClient(projectConfig: ProjectConfig): AxiosInstance {
    return axios.create({
      baseURL: 'https://subproject.api.sinch.com',
      headers: {
        'Authorization': `Bearer ${projectConfig.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // List all configured projects
  listConfiguredProjects(): Array<{name: string, displayName?: string, projectId?: string}> {
    const projects = [];
    
    if (this.config.projects) {
      for (const [name, config] of Object.entries(this.config.projects)) {
        projects.push({
          name,
          displayName: config.displayName || name,
          projectId: config.projectId
        });
      }
    }
    
    // Add legacy config if exists
    if (this.config.servicePlanId && this.config.apiToken) {
      projects.push({
        name: 'default',
        displayName: 'Default Project',
        projectId: this.config.projectId
      });
    }
    
    return projects;
  }

  // SMS API methods (now with project selection)
  async sendSMS(to: string[], from: string, body: string, options: any = {}, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const smsClient = this.createSMSClient(projectConfig);
    
    const response = await smsClient.post(
      `/xms/v1/${projectConfig.servicePlanId}/batches`,
      {
        to,
        from,
        body,
        delivery_report: options.delivery_report || 'none',
        expire_at: options.expire_at,
        flash_message: options.flash_message || false,
        ...options
      }
    );
    return response.data;
  }

  async getSMSBatch(batchId: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const smsClient = this.createSMSClient(projectConfig);
    
    const response = await smsClient.get(
      `/xms/v1/${projectConfig.servicePlanId}/batches/${batchId}`
    );
    return response.data;
  }

  async getDeliveryReport(batchId: string, full = false, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const smsClient = this.createSMSClient(projectConfig);
    
    const endpoint = full ? 'delivery_report/full' : 'delivery_report/summary';
    const response = await smsClient.get(
      `/xms/v1/${projectConfig.servicePlanId}/batches/${batchId}/${endpoint}`
    );
    return response.data;
  }

  async listSMSBatches(startDate?: string, endDate?: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const smsClient = this.createSMSClient(projectConfig);
    
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    
    const response = await smsClient.get(
      `/xms/v1/${projectConfig.servicePlanId}/batches?${params}`
    );
    return response.data;
  }

  // Numbers API methods (now with project selection)
  async searchAvailableNumbers(regionCode?: string, type?: string, capability?: string[], projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const numbersClient = this.createNumbersClient(projectConfig);
    
    if (!projectConfig.projectId) {
      throw new Error(`Project ID required for Numbers API. Please configure projectId for project '${projectName || 'default'}'`);
    }
    
    const params = new URLSearchParams();
    if (regionCode) params.set('regionCode', regionCode);
    if (type) params.set('type', type);
    if (capability?.length) params.set('capability', capability.join(','));

    const response = await numbersClient.get(
      `/v1/projects/${projectConfig.projectId}/availableNumbers?${params}`
    );
    return response.data;
  }

  async activateNumber(phoneNumber: string, smsConfiguration?: any, voiceConfiguration?: any, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const numbersClient = this.createNumbersClient(projectConfig);
    
    if (!projectConfig.projectId) {
      throw new Error(`Project ID required for Numbers API. Please configure projectId for project '${projectName || 'default'}'`);
    }
    
    const response = await numbersClient.post(
      `/v1/projects/${projectConfig.projectId}/activeNumbers`,
      {
        phoneNumber,
        smsConfiguration,
        voiceConfiguration,
      }
    );
    return response.data;
  }

  async listActiveNumbers(projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const numbersClient = this.createNumbersClient(projectConfig);
    
    if (!projectConfig.projectId) {
      throw new Error(`Project ID required for Numbers API. Please configure projectId for project '${projectName || 'default'}'`);
    }
    
    const response = await numbersClient.get(
      `/v1/projects/${projectConfig.projectId}/activeNumbers`
    );
    return response.data;
  }

  async getActiveNumber(phoneNumber: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const numbersClient = this.createNumbersClient(projectConfig);
    
    if (!projectConfig.projectId) {
      throw new Error(`Project ID required for Numbers API. Please configure projectId for project '${projectName || 'default'}'`);
    }
    
    const response = await numbersClient.get(
      `/v1/projects/${projectConfig.projectId}/activeNumbers/${encodeURIComponent(phoneNumber)}`
    );
    return response.data;
  }

  async releaseNumber(phoneNumber: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const numbersClient = this.createNumbersClient(projectConfig);
    
    if (!projectConfig.projectId) {
      throw new Error(`Project ID required for Numbers API. Please configure projectId for project '${projectName || 'default'}'`);
    }
    
    const response = await numbersClient.delete(
      `/v1/projects/${projectConfig.projectId}/activeNumbers/${encodeURIComponent(phoneNumber)}`
    );
    return response.data;
  }

  // Verification API methods (now with project selection)
  async startVerification(identity: string, method: 'sms' | 'flashcall' | 'callout', options: any = {}, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const verificationClient = this.createVerificationClient(projectConfig);
    
    const response = await verificationClient.post(
      '/verification/v1/verifications',
      {
        identity: {
          type: 'number',
          endpoint: identity,
        },
        method,
        ...options
      }
    );
    return response.data;
  }

  async reportVerification(id: string, code: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const verificationClient = this.createVerificationClient(projectConfig);
    
    const response = await verificationClient.put(
      `/verification/v1/verifications/id/${id}`,
      { method: 'sms', sms: { code } }
    );
    return response.data;
  }

  async getVerification(id: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const verificationClient = this.createVerificationClient(projectConfig);
    
    const response = await verificationClient.get(
      `/verification/v1/verifications/id/${id}`
    );
    return response.data;
  }

  // Subproject/Project Management API methods (now with project selection)
  async createSubproject(parentProjectId: string, displayName: string, options: any = {}, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const subprojectClient = this.createSubprojectClient(projectConfig);
    
    const response = await subprojectClient.post(
      `/v1alpha1/projects/${parentProjectId}/subprojects`,
      {
        displayName,
        ...options
      }
    );
    return response.data;
  }

  async listSubprojects(parentProjectId: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const subprojectClient = this.createSubprojectClient(projectConfig);
    
    const response = await subprojectClient.get(
      `/v1alpha1/projects/${parentProjectId}/subprojects`
    );
    return response.data;
  }

  async getSubproject(parentProjectId: string, subprojectId: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const subprojectClient = this.createSubprojectClient(projectConfig);
    
    const response = await subprojectClient.get(
      `/v1alpha1/projects/${parentProjectId}/subprojects/${subprojectId}`
    );
    return response.data;
  }

  async deleteSubproject(parentProjectId: string, subprojectId: string, projectName?: string) {
    const projectConfig = this.getProjectConfig(projectName);
    const subprojectClient = this.createSubprojectClient(projectConfig);
    
    const response = await subprojectClient.delete(
      `/v1alpha1/projects/${parentProjectId}/subprojects/${subprojectId}`
    );
    return response.data;
  }

  // Multi-project management helpers
  async getAllSubprojectsAcrossParents() {
    const parentProjects = this.config.parentProjects || [];
    if (this.config.projectId) {
      parentProjects.push(this.config.projectId);
    }

    const allSubprojects = [];
    for (const parentProjectId of parentProjects) {
      try {
        const response = await this.listSubprojects(parentProjectId);
        allSubprojects.push({
          parentProjectId,
          subprojects: response.subprojects || []
        });
      } catch (error) {
        console.error(`Error fetching subprojects for parent ${parentProjectId}:`, error);
        allSubprojects.push({
          parentProjectId,
          error: error instanceof Error ? error.message : String(error),
          subprojects: []
        });
      }
    }
    return allSubprojects;
  }

  // Test connectivity to all parent projects
  async testParentProjectAccess() {
    const parentProjects = this.config.parentProjects || [];
    if (this.config.projectId) {
      parentProjects.push(this.config.projectId);
    }

    const results = [];
    for (const parentProjectId of parentProjects) {
      try {
        // Try to list subprojects as a connectivity test
        await this.listSubprojects(parentProjectId);
        results.push({
          parentProjectId,
          status: 'accessible',
          message: 'Successfully connected'
        });
      } catch (error) {
        results.push({
          parentProjectId,
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return results;
  }
}

// Initialize Sinch client (will be configured via environment variables)
let sinchClient: SinchAPIClient | null = null;

function getSinchClient(): SinchAPIClient {
  if (!sinchClient) {
    // Parse parent projects from environment (comma-separated list)
    const parentProjectsEnv = process.env.SINCH_PARENT_PROJECTS;
    const parentProjects = parentProjectsEnv ? parentProjectsEnv.split(',').map(p => p.trim()) : [];

    // Parse multi-project configuration from environment
    let projects: { [projectName: string]: ProjectConfig } | undefined;
    const projectsEnv = process.env.SINCH_PROJECTS;
    if (projectsEnv) {
      try {
        projects = JSON.parse(projectsEnv);
      } catch (error) {
        console.error('Error parsing SINCH_PROJECTS environment variable:', error);
      }
    }

    const config: SinchConfig = {
      // Legacy single-project config
      servicePlanId: process.env.SINCH_SERVICE_PLAN_ID,
      apiToken: process.env.SINCH_API_TOKEN,
      projectId: process.env.SINCH_PROJECT_ID,
      clientId: process.env.SINCH_CLIENT_ID,
      clientSecret: process.env.SINCH_CLIENT_SECRET,
      region: (process.env.SINCH_REGION as 'us' | 'eu' | 'au' | 'br' | 'ca') || 'us',
      parentProjects,
      
      // Multi-project config
      projects,
      defaultProject: process.env.SINCH_DEFAULT_PROJECT,
    };

    // Check if we have either legacy config or multi-project config
    if ((!config.servicePlanId || !config.apiToken) && !projects) {
      throw new Error('Either legacy config (SINCH_SERVICE_PLAN_ID + SINCH_API_TOKEN) or SINCH_PROJECTS environment variable is required');
    }

    sinchClient = new SinchAPIClient(config);
  }
  return sinchClient;
}

// Create MCP server
const server = new Server(
  {
    name: "sinch-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Resource handlers for listing SMS batches, numbers, etc.
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources: Array<{
    uri: string;
    mimeType: string;
    name: string;
    description: string;
  }> = [];
  
  try {
    const client = getSinchClient();
    
    // Add SMS batches as resources
    const batches = await client.listSMSBatches();
    batches.batches?.forEach((batch: SMSBatch) => {
      resources.push({
        uri: `sinch://sms/batch/${batch.id}`,
        mimeType: "application/json",
        name: `SMS Batch ${batch.id}`,
        description: `SMS batch to ${batch.to.length} recipients`
      });
    });

    // Add active numbers as resources
    if (process.env.SINCH_PROJECT_ID) {
      const activeNumbers = await client.listActiveNumbers();
      activeNumbers.activeNumbers?.forEach((number: any) => {
        resources.push({
          uri: `sinch://numbers/active/${encodeURIComponent(number.phoneNumber)}`,
          mimeType: "application/json",
          name: `Phone Number ${number.phoneNumber}`,
          description: `Active phone number with capabilities: ${number.capability?.join(', ')}`
        });
      });
    }
  } catch (error) {
    console.error('Error listing resources:', error);
  }

  return { resources };
});

// Resource reader for specific resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const client = getSinchClient();
  
  if (url.protocol === 'sinch:') {
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts[0] === 'sms' && pathParts[1] === 'batch' && pathParts[2]) {
      const batchId = pathParts[2];
      const batch = await client.getSMSBatch(batchId);
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(batch, null, 2)
        }]
      };
    }
    
    if (pathParts[0] === 'numbers' && pathParts[1] === 'active' && pathParts[2]) {
      const phoneNumber = decodeURIComponent(pathParts[2]);
      const number = await client.getActiveNumber(phoneNumber);
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(number, null, 2)
        }]
      };
    }
  }
  
  throw new Error(`Resource not found: ${request.params.uri}`);
});

export { server, getSinchClient };