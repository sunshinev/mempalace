import { type Plugin, tool } from "@opencode-ai/plugin"

/**
 * MemPalace Plugin for OpenCode
 *
 * Handles both READING and WRITING of MemPalace memories:
 *
 * READING (fetch context):
 * - Custom tool `mempalace_wakeup`: loads L0+L1 wake-up context (~170 tokens)
 *   at session start. The AI sees this tool and should call it first thing.
 * - Custom tool `mempalace_diary_recent`: reads the agent's recent diary
 *   entries to recall what happened in previous sessions.
 * - On `session.created` event: logs a reminder (the AI must call the tool).
 *
 * WRITING (save context):
 * - `experimental.session.compacting`: injects save instructions before
 *   context is compacted, ensuring the AI persists discoveries.
 * - `session.idle` event: macOS notification reminder.
 */
export const MemPalaceHooksPlugin: Plugin = async ({
  client,
  $,
  directory,
}) => {
  await client.app.log({
    body: {
      service: "mempalace-hooks",
      level: "info",
      message: "MemPalace hooks plugin loaded",
      extra: { directory },
    },
  })

  return {
    /**
     * Custom tools registered in OpenCode's tool palette.
     * The AI discovers these alongside built-in tools and can call them.
     */
    tool: {
      /**
       * Wake-up tool: loads L0 (identity) + L1 (critical facts) context.
       * The AI should call this at the START of every new session to
       * remember who the user is, their team, projects, and preferences.
       *
       * The tool description tells the AI when to use it — OpenCode
       * shows tool descriptions in the system prompt automatically.
       */
      mempalace_wakeup: tool({
        description:
          "Load your MemPalace wake-up context (L0 identity + L1 critical facts). " +
          "Call this at the START of every new conversation to remember the user's " +
          "world — their team, projects, preferences, and recent history. " +
          "Returns ~170 tokens of essential context. Always call this before doing any work.",
        args: {
          wing: tool.schema.optional(tool.schema.string()),
        },
        async execute(args, context) {
          try {
            const wingFlag = args.wing ? ` --wing ${args.wing}` : ""
            const result =
              await $`python3 -m mempalace.cli wake-up${wingFlag}`.text()
            return result.trim() || "No wake-up context found. Run `mempalace init` and `mempalace mine` first."
          } catch (error) {
            return `MemPalace wake-up failed: ${error}. Ensure mempalace is installed (pip install mempalace) and initialized.`
          }
        },
      }),

      /**
       * Diary tool: reads the agent's recent diary entries.
       * Useful for recalling what happened in previous sessions
       * without a full search — the diary is the agent's own memory log.
       */
      mempalace_diary_recent: tool({
        description:
          "Read your recent MemPalace diary entries from previous sessions. " +
          "Use this to recall what you worked on recently, key findings, and pending tasks. " +
          "Complements mempalace_wakeup — call wakeup first for identity, then diary for recent history.",
        args: {
          agent_name: tool.schema.optional(tool.schema.string()),
          last_n: tool.schema.optional(tool.schema.number()),
        },
        async execute(args) {
          try {
            const agentName = args.agent_name || "opencode"
            const lastN = args.last_n || 5
            // Use the MCP server's diary_read if available, otherwise fall back to search
            const result =
              await $`python3 -c "
from mempalace.mcp_server import *
import json
entries = diary_read('${agentName}', ${lastN})
print(json.dumps(entries, indent=2, ensure_ascii=False))
"`.text()
            return result.trim() || "No diary entries found yet."
          } catch (error) {
            return `Diary read failed: ${error}. The diary may be empty or mempalace may not be initialized.`
          }
        },
      }),

      /**
       * Quick search tool: semantic search across all palace memories.
       * A convenience wrapper — the AI can also use MCP tools directly
       * if the MCP server is configured.
       */
      mempalace_quick_search: tool({
        description:
          "Search your MemPalace for any topic — decisions, conversations, code patterns, people. " +
          "Returns the most relevant verbatim memories. Use this when you need to recall " +
          "something specific from past sessions.",
        args: {
          query: tool.schema.string(),
          wing: tool.schema.optional(tool.schema.string()),
          room: tool.schema.optional(tool.schema.string()),
          limit: tool.schema.optional(tool.schema.number()),
        },
        async execute(args) {
          try {
            let cmd = `python3 -m mempalace.cli search "${args.query}"`
            if (args.wing) cmd += ` --wing ${args.wing}`
            if (args.room) cmd += ` --room ${args.room}`
            if (args.limit) cmd += ` --limit ${args.limit}`
            const result = await $`${cmd}`.text()
            return result.trim() || "No results found."
          } catch (error) {
            return `Search failed: ${error}`
          }
        },
      }),
    },

    /**
     * Before context compaction: inject MemPalace save + reload instructions.
     * This ensures the AI:
     * 1. SAVES discoveries before history is truncated
     * 2. RELOADS context after compaction via mempalace_wakeup
     */
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`## MemPalace Auto-Save (Pre-Compaction)

CRITICAL: Before generating the compaction summary, you MUST save session knowledge to MemPalace.

### Step 1: Save Before Compaction

1. **Write a diary entry** using mempalace_diary_write:
   - agent_name: "opencode"
   - entry: AAAK-compressed summary of this session's work
   - topic: relevant topic tag (e.g., "code-review", "debugging", "feature-work")
   - Include: what was done, key findings, decisions made, files touched

2. **Add Knowledge Graph facts** using mempalace_kg_add for any:
   - New entities discovered (apps, services, people, projects)
   - Relationships between entities
   - Decisions made (chose approach A over B)

3. **File important discoveries** using mempalace_add_drawer for:
   - Reusable technical findings
   - Configuration patterns or workarounds
   - Wing: "wing_code" or project-specific wing, Room: descriptive slug

### Step 2: After Compaction Resumes

After compaction, call **mempalace_wakeup** to reload your identity and critical facts,
then call **mempalace_diary_recent** to recall what you were working on.

### AAAK Format Reference
- ENTITIES: 3-letter uppercase codes (e.g., LSE=lse2, SUN=sunfire)
- IMPORTANCE: stars 1-5
- STRUCTURE: Pipe-separated fields, dates in ISO format
- Example: SESSION:2026-04-10|feature.chinese-translations|18.files.translated+readme.cn.added|stars:3

### What to Include in Compaction Summary
After saving to MemPalace, include in the summary:
- Goal: what the user is trying to accomplish
- Instructions: any standing user preferences or constraints
- Discoveries: technical findings from this session
- Accomplished: completed tasks
- Relevant files/directories touched
- Pending work and next steps`)
    },

    /**
     * Event handler for session lifecycle events.
     */
    event: async ({ event }) => {
      // New session created — log reminder to load MemPalace context
      if (event.type === "session.created") {
        await client.app.log({
          body: {
            service: "mempalace-hooks",
            level: "info",
            message:
              "New session created. AI should call mempalace_wakeup to load context.",
          },
        })
      }

      // Session idle — macOS notification
      if (event.type === "session.idle") {
        try {
          await $`osascript -e 'display notification "Session idle — remember to save to MemPalace diary" with title "OpenCode MemPalace"'`
        } catch {
          // Notification failed silently — not critical
        }
      }

      // After compaction — log reminder to reload context
      if (event.type === "session.compacted") {
        await client.app.log({
          body: {
            service: "mempalace-hooks",
            level: "info",
            message:
              "Session compacted. AI should call mempalace_wakeup + mempalace_diary_recent to reload context.",
          },
        })
      }
    },
  }
}
