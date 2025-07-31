/**
 * Sinch MCP Server Tools
 *
 * This module defines all the tools available through the Sinch MCP server.
 * Tools are operations that can be invoked by the MCP client to interact with Sinch APIs.
 */
import { getSinchClient } from './sinch-server.js';
export const tools = [
    // Project Management Tools
    {
        name: "list_configured_projects",
        description: "List all configured Sinch projects available for use",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    // SMS Tools
    {
        name: "send_sms",
        description: "Send an SMS message to one or more recipients",
        inputSchema: {
            type: "object",
            properties: {
                to: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of phone numbers in E.164 format (e.g., +1234567890)"
                },
                from: {
                    type: "string",
                    description: "Sender phone number or short code"
                },
                body: {
                    type: "string",
                    description: "Message content (max 1600 characters)"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                },
                delivery_report: {
                    type: "string",
                    enum: ["none", "summary", "full", "per_recipient"],
                    description: "Type of delivery report requested",
                    default: "none"
                },
                expire_at: {
                    type: "string",
                    description: "ISO 8601 timestamp when message expires"
                },
                flash_message: {
                    type: "boolean",
                    description: "Send as flash SMS (displayed immediately)",
                    default: false
                }
            },
            required: ["to", "from", "body"]
        }
    },
    {
        name: "get_sms_batch",
        description: "Get details of a specific SMS batch",
        inputSchema: {
            type: "object",
            properties: {
                batch_id: {
                    type: "string",
                    description: "The ID of the SMS batch to retrieve"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["batch_id"]
        }
    },
    {
        name: "get_delivery_report",
        description: "Get delivery report for an SMS batch",
        inputSchema: {
            type: "object",
            properties: {
                batch_id: {
                    type: "string",
                    description: "The ID of the SMS batch"
                },
                full: {
                    type: "boolean",
                    description: "Get full report with recipient details",
                    default: false
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["batch_id"]
        }
    },
    {
        name: "list_sms_batches",
        description: "List SMS batches within a date range",
        inputSchema: {
            type: "object",
            properties: {
                start_date: {
                    type: "string",
                    description: "Start date in ISO 8601 format"
                },
                end_date: {
                    type: "string",
                    description: "End date in ISO 8601 format"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            }
        }
    },
    // Numbers API Tools
    {
        name: "search_available_numbers",
        description: "Search for available phone numbers to purchase",
        inputSchema: {
            type: "object",
            properties: {
                region_code: {
                    type: "string",
                    description: "Two-letter country code (e.g., US, GB, SE)"
                },
                type: {
                    type: "string",
                    enum: ["LOCAL", "MOBILE", "TOLL_FREE"],
                    description: "Type of phone number"
                },
                capability: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["SMS", "VOICE"]
                    },
                    description: "Required capabilities for the number"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            }
        }
    },
    {
        name: "activate_number",
        description: "Activate/purchase a phone number for use with Sinch services",
        inputSchema: {
            type: "object",
            properties: {
                phone_number: {
                    type: "string",
                    description: "Phone number in E.164 format to activate"
                },
                sms_configuration: {
                    type: "object",
                    properties: {
                        service_plan_id: {
                            type: "string",
                            description: "Service plan ID for SMS"
                        },
                        campaign_id: {
                            type: "string",
                            description: "Campaign ID for SMS (US only)"
                        }
                    },
                    description: "SMS configuration for the number"
                },
                voice_configuration: {
                    type: "object",
                    properties: {
                        app_id: {
                            type: "string",
                            description: "Application ID for voice"
                        }
                    },
                    description: "Voice configuration for the number"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["phone_number"]
        }
    },
    {
        name: "list_active_numbers",
        description: "List all active phone numbers in your account",
        inputSchema: {
            type: "object",
            properties: {
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            }
        }
    },
    {
        name: "get_active_number",
        description: "Get details of a specific active phone number",
        inputSchema: {
            type: "object",
            properties: {
                phone_number: {
                    type: "string",
                    description: "Phone number in E.164 format"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["phone_number"]
        }
    },
    {
        name: "release_number",
        description: "Release/cancel a phone number",
        inputSchema: {
            type: "object",
            properties: {
                phone_number: {
                    type: "string",
                    description: "Phone number in E.164 format to release"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["phone_number"]
        }
    },
    // Verification API Tools
    {
        name: "start_verification",
        description: "Start phone number verification process",
        inputSchema: {
            type: "object",
            properties: {
                phone_number: {
                    type: "string",
                    description: "Phone number in E.164 format to verify"
                },
                method: {
                    type: "string",
                    enum: ["sms", "flashcall", "callout"],
                    description: "Verification method to use"
                },
                custom: {
                    type: "string",
                    description: "Custom data to include in verification"
                },
                reference: {
                    type: "string",
                    description: "Reference ID for the verification"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["phone_number", "method"]
        }
    },
    {
        name: "report_verification",
        description: "Report/verify the verification code",
        inputSchema: {
            type: "object",
            properties: {
                verification_id: {
                    type: "string",
                    description: "The verification ID from start_verification"
                },
                code: {
                    type: "string",
                    description: "The verification code received by the user"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["verification_id", "code"]
        }
    },
    {
        name: "get_verification",
        description: "Get status of a verification request",
        inputSchema: {
            type: "object",
            properties: {
                verification_id: {
                    type: "string",
                    description: "The verification ID to check"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["verification_id"]
        }
    },
    // Project Management Tools
    {
        name: "create_subproject",
        description: "Create a new subproject under a parent project (useful for reseller scenarios)",
        inputSchema: {
            type: "object",
            properties: {
                parent_project_id: {
                    type: "string",
                    description: "The parent project ID to create the subproject under"
                },
                display_name: {
                    type: "string",
                    description: "Display name for the new subproject"
                },
                description: {
                    type: "string",
                    description: "Optional description for the subproject"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["parent_project_id", "display_name"]
        }
    },
    {
        name: "list_subprojects",
        description: "List all subprojects under a parent project",
        inputSchema: {
            type: "object",
            properties: {
                parent_project_id: {
                    type: "string",
                    description: "The parent project ID to list subprojects for"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["parent_project_id"]
        }
    },
    {
        name: "get_subproject",
        description: "Get details of a specific subproject",
        inputSchema: {
            type: "object",
            properties: {
                parent_project_id: {
                    type: "string",
                    description: "The parent project ID"
                },
                subproject_id: {
                    type: "string",
                    description: "The subproject ID to retrieve"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["parent_project_id", "subproject_id"]
        }
    },
    {
        name: "delete_subproject",
        description: "Delete a subproject when no longer needed",
        inputSchema: {
            type: "object",
            properties: {
                parent_project_id: {
                    type: "string",
                    description: "The parent project ID"
                },
                subproject_id: {
                    type: "string",
                    description: "The subproject ID to delete"
                },
                project_config: {
                    type: "string",
                    description: "Name of the project configuration to use (optional - uses default if not specified)"
                }
            },
            required: ["parent_project_id", "subproject_id"]
        }
    },
    // Multi-Project Management Tools
    {
        name: "list_all_subprojects",
        description: "List all subprojects across all configured parent projects",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "test_parent_projects",
        description: "Test connectivity and access to all configured parent projects",
        inputSchema: {
            type: "object",
            properties: {}
        }
    }
];
export async function handleToolCall(name, args) {
    const client = getSinchClient();
    switch (name) {
        case "list_configured_projects":
            return client.listConfiguredProjects();
        case "send_sms":
            return await client.sendSMS(args.to, args.from, args.body, {
                delivery_report: args.delivery_report,
                expire_at: args.expire_at,
                flash_message: args.flash_message
            }, args.project_config);
        case "get_sms_batch":
            return await client.getSMSBatch(args.batch_id, args.project_config);
        case "get_delivery_report":
            return await client.getDeliveryReport(args.batch_id, args.full, args.project_config);
        case "list_sms_batches":
            return await client.listSMSBatches(args.start_date, args.end_date, args.project_config);
        case "search_available_numbers":
            return await client.searchAvailableNumbers(args.region_code, args.type, args.capability, args.project_config);
        case "activate_number":
            return await client.activateNumber(args.phone_number, args.sms_configuration, args.voice_configuration, args.project_config);
        case "list_active_numbers":
            return await client.listActiveNumbers(args.project_config);
        case "get_active_number":
            return await client.getActiveNumber(args.phone_number, args.project_config);
        case "release_number":
            return await client.releaseNumber(args.phone_number, args.project_config);
        case "start_verification":
            return await client.startVerification(args.phone_number, args.method, {
                custom: args.custom,
                reference: args.reference
            }, args.project_config);
        case "report_verification":
            return await client.reportVerification(args.verification_id, args.code, args.project_config);
        case "get_verification":
            return await client.getVerification(args.verification_id, args.project_config);
        // Project Management Tools
        case "create_subproject":
            return await client.createSubproject(args.parent_project_id, args.display_name, { description: args.description }, args.project_config);
        case "list_subprojects":
            return await client.listSubprojects(args.parent_project_id, args.project_config);
        case "get_subproject":
            return await client.getSubproject(args.parent_project_id, args.subproject_id, args.project_config);
        case "delete_subproject":
            return await client.deleteSubproject(args.parent_project_id, args.subproject_id, args.project_config);
        // Multi-Project Management Tools
        case "list_all_subprojects":
            return await client.getAllSubprojectsAcrossParents();
        case "test_parent_projects":
            return await client.testParentProjectAccess();
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
