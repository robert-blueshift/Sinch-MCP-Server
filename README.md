# Sinch MCP Server

A comprehensive Model Context Protocol (MCP) server for Sinch communication APIs, providing access to SMS, Voice, Number Provisioning, and Verification services.

## Features

This MCP server provides access to the following Sinch APIs:

### SMS API
- ✅ Send SMS messages to single or multiple recipients
- ✅ Get SMS batch details and status
- ✅ Retrieve delivery reports (summary and full)
- ✅ List SMS batches with date filtering
- ✅ Support for flash messages and message expiration

### Numbers API  
- ✅ Search for available phone numbers by region and capability
- ✅ Activate/purchase phone numbers
- ✅ List active phone numbers in your account
- ✅ Get details of specific active numbers
- ✅ Release/cancel phone numbers

### Verification API
- ✅ Start phone number verification (SMS, Flash Call, Call-out)
- ✅ Verify/report verification codes
- ✅ Check verification status and results

### Project Management API
- ✅ Create subprojects under parent projects (perfect for reseller scenarios)
- ✅ List all subprojects for a parent project
- ✅ Get detailed information about specific subprojects
- ✅ Delete subprojects when no longer needed

### Multi-Project Support 🆕
- ✅ **Dynamic Credential Mapping** - Configure multiple projects with different credentials
- ✅ **Project Selection** - Choose which project to use for each API call
- ✅ **Unified Management** - Manage multiple Sinch projects from one MCP server
- ✅ **Backward Compatibility** - Legacy single-project configuration still supported

### Resources
- ✅ Browse SMS batches as resources
- ✅ Browse active phone numbers as resources
- ✅ JSON-formatted resource content

## Installation

1. Clone the repository:
```bash
git clone https://github.com/robert-blueshift/Sinch-MCP-Server.git
cd Sinch-MCP-Server
```

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

## Configuration

The server supports two configuration approaches:

### 1. Legacy Single-Project Configuration

#### Required
- `SINCH_SERVICE_PLAN_ID` - Your Sinch Service Plan ID (required for SMS API)
- `SINCH_API_TOKEN` - Your Sinch API Token (Bearer token)

#### Optional
- `SINCH_PROJECT_ID` - Your Sinch Project ID (required for Numbers API)
- `SINCH_PARENT_PROJECTS` - Comma-separated list of parent project IDs for multi-project setups
- `SINCH_CLIENT_ID` - Client ID for OAuth authentication
- `SINCH_CLIENT_SECRET` - Client secret for OAuth authentication  
- `SINCH_REGION` - API region (`us`, `eu`, `au`, `br`, `ca`) - defaults to `us`

### 2. Multi-Project Configuration (Recommended) 🆕

#### Required
- `SINCH_PROJECTS` - JSON object containing project configurations

#### Optional
- `SINCH_DEFAULT_PROJECT` - Name of the default project to use when no `project_config` is specified

#### Multi-Project JSON Format
```json
{
  "production": {
    "servicePlanId": "prod-service-plan-id",
    "apiToken": "prod-api-token",
    "projectId": "prod-project-id",
    "region": "us",
    "displayName": "Production Environment"
  },
  "staging": {
    "servicePlanId": "staging-service-plan-id",
    "apiToken": "staging-api-token", 
    "projectId": "staging-project-id",
    "region": "us",
    "displayName": "Staging Environment"
  }
}
```

### Getting Your Credentials

1. Sign up for a [Sinch account](https://dashboard.sinch.com/)
2. Create a new project in the Sinch Dashboard
3. Navigate to SMS → API Settings to get your Service Plan ID and API Token
4. For Numbers API, get your Project ID from the project settings
5. Configure your environment variables

### Example Environment Setup

Create a `.env` file or set environment variables:

```bash
export SINCH_SERVICE_PLAN_ID="your-service-plan-id"
export SINCH_API_TOKEN="your-api-token"  
export SINCH_PROJECT_ID="your-project-id"
export SINCH_PARENT_PROJECTS="proj-123,proj-456,proj-789"  # For multi-project setups
export SINCH_REGION="us"
```

## Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run watch
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "sinch": {
      "command": "node",
      "args": ["/path/to/sinch-mcp-server/build/index.js"],
      "env": {
        "SINCH_SERVICE_PLAN_ID": "your-service-plan-id",
        "SINCH_API_TOKEN": "your-api-token",
        "SINCH_PROJECT_ID": "your-project-id",
        "SINCH_PARENT_PROJECTS": "proj-123,proj-456,proj-789",
        "SINCH_REGION": "us"
      }
    }
  }
}
```

## Multi-Project Usage 🆕

### Project Selection

Every tool now supports an optional `project_config` parameter to specify which project configuration to use:

```json
{
  "to": ["+1234567890"],
  "from": "+1555000123", 
  "body": "Hello from staging!",
  "project_config": "staging"
}
```

If no `project_config` is specified, the server uses:
1. The `SINCH_DEFAULT_PROJECT` if configured
2. Legacy single-project credentials as fallback

### Managing Multiple Projects

Use the `list_configured_projects` tool to see all available project configurations:

```json
{
  "tool": "list_configured_projects"
}
```

This returns all configured projects with their display names and project IDs, making it easy to choose which project to use for each operation.

## Available Tools

### Project Management Tools

#### `list_configured_projects` 🆕
List all configured Sinch projects available for use.

**Parameters:** None

**Returns:** Array of configured projects with names, display names, and project IDs

**Example Response:**
```json
[
  {
    "name": "production",
    "displayName": "Production Environment", 
    "projectId": "prod-project-id"
  },
  {
    "name": "staging",
    "displayName": "Staging Environment",
    "projectId": "staging-project-id"
  }
]
```

### SMS Tools

#### `send_sms`
Send SMS messages to one or more recipients.

**Parameters:**
- `to` (string[]): Phone numbers in E.164 format
- `from` (string): Sender phone number or short code
- `body` (string): Message content (max 1600 characters)
- `project_config` (optional): Name of the project configuration to use
- `delivery_report` (optional): Type of delivery report (`none`, `summary`, `full`, `per_recipient`)
- `expire_at` (optional): ISO 8601 timestamp when message expires
- `flash_message` (optional): Send as flash SMS

**Example:**
```json
{
  "to": ["+1234567890", "+1987654321"],
  "from": "+1555000123",
  "body": "Hello from Sinch MCP Server!",
  "project_config": "production",
  "delivery_report": "summary"
}
```

#### `get_sms_batch`
Get details of a specific SMS batch.

**Parameters:**
- `batch_id` (string): The SMS batch ID

#### `get_delivery_report`
Get delivery report for an SMS batch.

**Parameters:**
- `batch_id` (string): The SMS batch ID
- `full` (optional boolean): Get full report with recipient details

#### `list_sms_batches`
List SMS batches within a date range.

**Parameters:**
- `start_date` (optional): Start date in ISO 8601 format
- `end_date` (optional): End date in ISO 8601 format

### Numbers Tools

#### `search_available_numbers`
Search for available phone numbers to purchase.

**Parameters:**
- `region_code` (optional): Two-letter country code (e.g., "US", "GB")
- `type` (optional): Number type (`LOCAL`, `MOBILE`, `TOLL_FREE`)
- `capability` (optional): Required capabilities (`SMS`, `VOICE`)

#### `activate_number`
Activate/purchase a phone number.

**Parameters:**
- `phone_number` (string): Phone number in E.164 format
- `sms_configuration` (optional): SMS configuration object
- `voice_configuration` (optional): Voice configuration object

#### `list_active_numbers`
List all active phone numbers in your account.

#### `get_active_number`
Get details of a specific active phone number.

**Parameters:**
- `phone_number` (string): Phone number in E.164 format

#### `release_number`
Release/cancel a phone number.

**Parameters:**
- `phone_number` (string): Phone number in E.164 format

### Verification Tools

#### `start_verification`
Start phone number verification process.

**Parameters:**
- `phone_number` (string): Phone number in E.164 format
- `method` (string): Verification method (`sms`, `flashcall`, `callout`)
- `custom` (optional): Custom data to include
- `reference` (optional): Reference ID for the verification

#### `report_verification`
Report/verify the verification code.

**Parameters:**
- `verification_id` (string): The verification ID from start_verification
- `code` (string): The verification code received by the user

#### `get_verification`
Get status of a verification request.

**Parameters:**
- `verification_id` (string): The verification ID to check

### Project Management Tools

#### `create_subproject`
Create a new subproject under a parent project (perfect for reseller scenarios).

**Parameters:**
- `parent_project_id` (string): The parent project ID to create the subproject under
- `display_name` (string): Display name for the new subproject
- `description` (optional): Description for the subproject

**Example:**
```json
{
  "parent_project_id": "your-parent-project-id",
  "display_name": "Customer ABC Project",
  "description": "Dedicated project for Customer ABC communications"
}
```

#### `list_subprojects`
List all subprojects under a parent project.

**Parameters:**
- `parent_project_id` (string): The parent project ID to list subprojects for

#### `get_subproject`
Get details of a specific subproject.

**Parameters:**
- `parent_project_id` (string): The parent project ID
- `subproject_id` (string): The subproject ID to retrieve

#### `delete_subproject`
Delete a subproject when no longer needed.

**Parameters:**
- `parent_project_id` (string): The parent project ID
- `subproject_id` (string): The subproject ID to delete

#### `list_all_subprojects`
List all subprojects across all configured parent projects (perfect for multi-project setups).

**Parameters:** None

**Returns:** Array of objects containing parent project IDs and their subprojects

#### `test_parent_projects`
Test connectivity and access to all configured parent projects.

**Parameters:** None

**Returns:** Status report for each parent project showing accessibility

## Multi-Project Setup

Perfect for managing multiple parent projects in your account:

### Configuration
```bash
# Set multiple parent projects (comma-separated)
SINCH_PARENT_PROJECTS="project-1-id,project-2-id,project-3-id"
```

### Benefits
- **Unified Management** - Manage all projects from one MCP server
- **Cross-Project Visibility** - See all subprojects across parent projects
- **Bulk Operations** - Test connectivity to all projects at once
- **Centralized Dashboard** - Perfect for your provisioning dashboard

## Resources

The server exposes the following resources:

### SMS Batches
- URI: `sinch://sms/batch/{batch_id}`
- Lists all SMS batches with their details
- Content includes recipient count, status, and timestamps

### Active Numbers
- URI: `sinch://numbers/active/{phone_number}`
- Lists all active phone numbers
- Content includes capabilities, pricing, and configuration

## Error Handling

The server includes comprehensive error handling:
- Invalid API credentials
- Network connectivity issues
- Malformed requests
- Sinch API errors
- Missing required parameters

All errors are returned with descriptive messages to help with debugging.

## Development

### Project Structure

```
src/
├── index.ts          # Main entry point and server setup
├── sinch-server.ts   # Core server implementation and API client
└── tools.ts          # Tool definitions and handlers
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run watch  # Auto-rebuild on changes
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **This MCP Server**: Open an issue on this repository
- **Sinch APIs**: Check [Sinch Developer Documentation](https://developers.sinch.com/)
- **MCP Protocol**: Check [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

## Roadmap

- [x] **Project Management API** - Create and manage subprojects (✅ Complete!)
- [ ] Email API support via Conversation API
- [ ] Webhook support for real-time events
- [ ] Voice API tools
- [ ] Conversation API multi-channel messaging
- [ ] Advanced number search filters
- [ ] Batch operations for numbers
- [ ] Campaign management tools
- [ ] Analytics and reporting resources
- [ ] Access Keys Management API integration
