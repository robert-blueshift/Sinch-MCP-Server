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
import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
class SinchAPIClient {
    smsClient;
    numbersClient;
    verificationClient;
    subprojectClient;
    config;
    constructor(config) {
        this.config = config;
        // SMS API client
        const region = config.region || 'us';
        const smsBaseURL = `https://${region}.sms.api.sinch.com`;
        this.smsClient = axios.create({
            baseURL: smsBaseURL,
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
        // Numbers API client
        this.numbersClient = axios.create({
            baseURL: 'https://numbers.api.sinch.com',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
        // Verification API client
        this.verificationClient = axios.create({
            baseURL: 'https://verification.api.sinch.com',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
        // Subproject API client (for project management)
        this.subprojectClient = axios.create({
            baseURL: 'https://subproject.api.sinch.com',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }
    // SMS API methods
    async sendSMS(to, from, body, options = {}) {
        const response = await this.smsClient.post(`/xms/v1/${this.config.servicePlanId}/batches`, {
            to,
            from,
            body,
            delivery_report: options.delivery_report || 'none',
            expire_at: options.expire_at,
            flash_message: options.flash_message || false,
            ...options
        });
        return response.data;
    }
    async getSMSBatch(batchId) {
        const response = await this.smsClient.get(`/xms/v1/${this.config.servicePlanId}/batches/${batchId}`);
        return response.data;
    }
    async getDeliveryReport(batchId, full = false) {
        const endpoint = full ? 'delivery_report/full' : 'delivery_report/summary';
        const response = await this.smsClient.get(`/xms/v1/${this.config.servicePlanId}/batches/${batchId}/${endpoint}`);
        return response.data;
    }
    async listSMSBatches(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.set('start_date', startDate);
        if (endDate)
            params.set('end_date', endDate);
        const response = await this.smsClient.get(`/xms/v1/${this.config.servicePlanId}/batches?${params}`);
        return response.data;
    }
    // Numbers API methods
    async searchAvailableNumbers(regionCode, type, capability) {
        const params = new URLSearchParams();
        if (regionCode)
            params.set('regionCode', regionCode);
        if (type)
            params.set('type', type);
        if (capability?.length)
            params.set('capability', capability.join(','));
        const response = await this.numbersClient.get(`/v1/projects/${this.config.projectId}/availableNumbers?${params}`);
        return response.data;
    }
    async activateNumber(phoneNumber, smsConfiguration, voiceConfiguration) {
        const response = await this.numbersClient.post(`/v1/projects/${this.config.projectId}/activeNumbers`, {
            phoneNumber,
            smsConfiguration,
            voiceConfiguration,
        });
        return response.data;
    }
    async listActiveNumbers() {
        const response = await this.numbersClient.get(`/v1/projects/${this.config.projectId}/activeNumbers`);
        return response.data;
    }
    async getActiveNumber(phoneNumber) {
        const response = await this.numbersClient.get(`/v1/projects/${this.config.projectId}/activeNumbers/${encodeURIComponent(phoneNumber)}`);
        return response.data;
    }
    async releaseNumber(phoneNumber) {
        const response = await this.numbersClient.delete(`/v1/projects/${this.config.projectId}/activeNumbers/${encodeURIComponent(phoneNumber)}`);
        return response.data;
    }
    // Verification API methods
    async startVerification(identity, method, options = {}) {
        const response = await this.verificationClient.post('/verification/v1/verifications', {
            identity: {
                type: 'number',
                endpoint: identity,
            },
            method,
            ...options
        });
        return response.data;
    }
    async reportVerification(id, code) {
        const response = await this.verificationClient.put(`/verification/v1/verifications/id/${id}`, { method: 'sms', sms: { code } });
        return response.data;
    }
    async getVerification(id) {
        const response = await this.verificationClient.get(`/verification/v1/verifications/id/${id}`);
        return response.data;
    }
    // Subproject/Project Management API methods
    async createSubproject(parentProjectId, displayName, options = {}) {
        const response = await this.subprojectClient.post(`/v1alpha1/projects/${parentProjectId}/subprojects`, {
            displayName,
            ...options
        });
        return response.data;
    }
    async listSubprojects(parentProjectId) {
        const response = await this.subprojectClient.get(`/v1alpha1/projects/${parentProjectId}/subprojects`);
        return response.data;
    }
    async getSubproject(parentProjectId, subprojectId) {
        const response = await this.subprojectClient.get(`/v1alpha1/projects/${parentProjectId}/subprojects/${subprojectId}`);
        return response.data;
    }
    async deleteSubproject(parentProjectId, subprojectId) {
        const response = await this.subprojectClient.delete(`/v1alpha1/projects/${parentProjectId}/subprojects/${subprojectId}`);
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
            }
            catch (error) {
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
            }
            catch (error) {
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
let sinchClient = null;
function getSinchClient() {
    if (!sinchClient) {
        // Parse parent projects from environment (comma-separated list)
        const parentProjectsEnv = process.env.SINCH_PARENT_PROJECTS;
        const parentProjects = parentProjectsEnv ? parentProjectsEnv.split(',').map(p => p.trim()) : [];
        const config = {
            servicePlanId: process.env.SINCH_SERVICE_PLAN_ID,
            apiToken: process.env.SINCH_API_TOKEN,
            projectId: process.env.SINCH_PROJECT_ID,
            clientId: process.env.SINCH_CLIENT_ID,
            clientSecret: process.env.SINCH_CLIENT_SECRET,
            region: process.env.SINCH_REGION || 'us',
            parentProjects,
        };
        if (!config.servicePlanId || !config.apiToken) {
            throw new Error('SINCH_SERVICE_PLAN_ID and SINCH_API_TOKEN environment variables are required');
        }
        sinchClient = new SinchAPIClient(config);
    }
    return sinchClient;
}
// Create MCP server
const server = new Server({
    name: "sinch-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Resource handlers for listing SMS batches, numbers, etc.
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];
    try {
        const client = getSinchClient();
        // Add SMS batches as resources
        const batches = await client.listSMSBatches();
        batches.batches?.forEach((batch) => {
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
            activeNumbers.activeNumbers?.forEach((number) => {
                resources.push({
                    uri: `sinch://numbers/active/${encodeURIComponent(number.phoneNumber)}`,
                    mimeType: "application/json",
                    name: `Phone Number ${number.phoneNumber}`,
                    description: `Active phone number with capabilities: ${number.capability?.join(', ')}`
                });
            });
        }
    }
    catch (error) {
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
