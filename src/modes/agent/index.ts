import * as core from "@actions/core";
import type { Mode, ModeOptions, ModeResult } from "../types";
import { isAutomationContext } from "../../github/context";
import type { PreparedContext } from "../../create-prompt/types";

/**
 * Agent mode implementation.
 *
 * This mode is specifically designed for automation events (workflow_dispatch and schedule).
 * It bypasses the standard trigger checking and comment tracking used by tag mode,
 * making it ideal for scheduled tasks and manual workflow runs.
 */
export const agentMode: Mode = {
  name: "agent",
  description: "Automation mode for workflow_dispatch and schedule events",

  shouldTrigger(context) {
    // Only trigger for automation events
    return isAutomationContext(context);
  },

  prepareContext(context) {
    // Agent mode doesn't use comment tracking or branch management
    return {
      mode: "agent",
      githubContext: context,
    };
  },

  getAllowedTools() {
    return [];
  },

  getDisallowedTools() {
    return [];
  },

  shouldCreateTrackingComment() {
    return false;
  },

  async prepare({ context }: ModeOptions): Promise<ModeResult> {
    // Agent mode handles automation events (workflow_dispatch, schedule) only

    // Agent mode doesn't need to create prompt files here - handled by createPrompt

    // Export tool environment variables for agent mode
    const baseTools = [
      "Edit",
      "MultiEdit",
      "Glob",
      "Grep",
      "LS",
      "Read",
      "Write",
    ];

    // Add user-specified tools
    const allowedTools = [...baseTools, ...context.inputs.allowedTools];
    const disallowedTools = [
      "WebSearch",
      "WebFetch",
      ...context.inputs.disallowedTools,
    ];

    // Export as INPUT_ prefixed variables for the base action
    core.exportVariable("INPUT_ALLOWED_TOOLS", allowedTools.join(","));
    core.exportVariable("INPUT_DISALLOWED_TOOLS", disallowedTools.join(","));

    // Agent mode uses a minimal MCP configuration
    // We don't need comment servers or PR-specific tools for automation
    const mcpConfig: any = {
      mcpServers: {},
    };

    // Add user-provided additional MCP config if any
    const additionalMcpConfig = process.env.MCP_CONFIG || "";
    if (additionalMcpConfig.trim()) {
      try {
        const additional = JSON.parse(additionalMcpConfig);
        if (additional && typeof additional === "object") {
          Object.assign(mcpConfig, additional);
        }
      } catch (error) {
        core.warning(`Failed to parse additional MCP config: ${error}`);
      }
    }

    core.setOutput("mcp_config", JSON.stringify(mcpConfig));

    return {
      commentId: undefined,
      branchInfo: {
        baseBranch: "",
        currentBranch: "",
        claudeBranch: undefined,
      },
      mcpConfig: JSON.stringify(mcpConfig),
    };
  },

  generatePrompt(context: PreparedContext): string {
    // Agent mode uses override or direct prompt, no GitHub data needed
    if (context.overridePrompt) {
      return context.overridePrompt;
    }

    if (context.directPrompt) {
      return context.directPrompt;
    }

    // Minimal fallback - repository is a string in PreparedContext
    return `Repository: ${context.repository}`;
  },

  getSystemPrompt() {
    // Agent mode doesn't need additional system prompts
    return undefined;
  },
};
