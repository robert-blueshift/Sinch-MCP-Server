#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import chalk from "chalk";
import ora from "ora";
import ejs from "ejs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateClaudeConfig(directory: string, name: string) {
  let configDir;
  switch (os.platform()) {
    case "darwin":
      configDir = path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
      );
      break;
    case "win32":
      configDir = path.join(process.env.APPDATA || "", "Claude");
      break;
    default:
      return;
  }

  const configFile = path.join(configDir, "claude_desktop_config.json");

  try {
    const config = JSON.parse(await fs.readFile(configFile, "utf-8"));

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    if (!config.mcpServers[name]) {
      config.mcpServers[name] = {
        command: "node",
        args: ["index.js"],
      };
    }

    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
    console.log(
      chalk.green(
        "✓ Successfully added MCP server to Claude.app configuration",
      ),
    );
  } catch {
    console.log(
      chalk.yellow("Note: Could not update Claude.app configuration"),
    );
  }
}

async function createServer(directory: string, options: any = {}) {
  const questions = [
    {
      type: "input",
      name: "name",
      message: "What is the name of your MCP server?",
      default: path.basename(directory),
      when: !options.name,
    },
    {
      type: "input",
      name: "description",
      message: "What is the description of your server?",
      default: "A Model Context Protocol server",
      when: !options.description,
    },
    {
      type: "confirm",
      name: "installForClaude",
      message: "Would you like to install this server for Claude.app?",
      default: true,
      when: os.platform() === "darwin" || os.platform() === "win32",
    },
  ];

  const answers = await inquirer.prompt(questions);

  const config = {
    name: options.name || answers.name,
    description: options.description || answers.description,
  };

  const spinner = ora("Creating MCP server...").start();

  try {
    // Check if directory already exists
    try {
      await fs.access(directory);
      spinner.fail(
        chalk.red(`Error: Directory '${directory}' already exists.`),
      );
      process.exit(1);
    } catch (err) {
      // Directory doesn't exist, we can proceed
    }

    // Create project directory
    await fs.mkdir(directory, { recursive: true });

    // Copy template files
    const templateDir = path.join(__dirname, "../template");
    const files = await fs.readdir(templateDir, { recursive: true });

    for (const file of files) {
      const sourcePath = path.join(templateDir, file);
      const stats = await fs.stat(sourcePath);

      if (!stats.isFile()) continue;

      const targetPath = path.join(directory, file.replace(".ejs", ""));
      const targetDir = path.dirname(targetPath);

      // Create subdirectories if needed
      await fs.mkdir(targetDir, { recursive: true });

      // Read and process template file
      let content = await fs.readFile(sourcePath, "utf-8");

      // Use EJS to render the template
      content = ejs.render(content, config);

      // Write processed file
      await fs.writeFile(targetPath, content);
    }

    spinner.succeed(chalk.green("MCP server created successfully!"));

    if (answers.installForClaude) {
      await updateClaudeConfig(directory, config.name);
    }

    // Print next steps
    console.log("\nNext steps:");
    console.log(chalk.cyan(`  cd ${directory}`));
    console.log(chalk.cyan("  npm install"));
    console.log(chalk.cyan("  npm run watch"));
    console.log(
      chalk.cyan("  npm link (optional, to make available globally)\n"),
    );
  } catch (error) {
    spinner.fail(chalk.red("Failed to create MCP server"));
    console.error(error);
    process.exit(1);
  }
}

const program = new Command()
  .name("create-mcp-server")
  .description("Create a new MCP server")
  .argument("[directory]", "Directory to create the server in", process.cwd())
  .option("-n, --name <name>", "Name of the server")
  .option("-d, --description <description>", "Description of the server")
  .action(createServer);

program.parse();
