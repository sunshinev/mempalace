import type { Plugin } from "@opencode-ai/plugin"

/**
 * MemPalace Auto-Save Plugin for OpenCode
 *
 * Ensures conversation discoveries, analysis results, and session context
 * are persisted to MemPalace before context compaction and on session idle.
 *
 * Two hooks:
 * 1. experimental.session.compacting — injects MemPalace save instructions
 *    into the compaction prompt so the AI saves before context is lost.
 * 2. session.idle — sends a macOS notification as a reminder.
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
     * Before context compaction: inject MemPalace save instructions.
     * This ensures the AI writes a diary entry and any KG facts
     * BEFORE the conversation history is summarized and truncated.
     */
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`## MemPalace Auto-Save (Pre-Compaction)

CRITICAL: Before generating the compaction summary, you MUST save session knowledge to MemPalace.

### Required Actions

1. **Write a diary entry** using mempalace_diary_write:
   - agent_name: "opencode"
   - entry: AAAK-compressed summary of this session's work
   - topic: relevant topic tag (e.g., "sunfire-analysis", "code-review", "debugging")
   - Include: what was done, key findings, decisions made, files touched

2. **Add Knowledge Graph facts** using mempalace_kg_add for any:
   - New entities discovered (apps, services, people, projects)
   - Relationships between entities (app X depends_on service Y)
   - Metrics or thresholds learned (app X has QPS of N)
   - Decisions made (chose approach A over B)

3. **File important discoveries** using mempalace_add_drawer for:
   - Reusable technical findings (e.g., "Sunfire PromQL does not support sort_desc()")
   - Configuration patterns or workarounds
   - Wing: "wing_code" or "wing_myproject", Room: descriptive slug

### AAAK Format Reference
- ENTITIES: 3-letter uppercase codes (e.g., LSE=lse2, SUN=sunfire)
- IMPORTANCE: stars 1-5
- STRUCTURE: Pipe-separated fields, dates in ISO format
- Example: SESSION:2026-04-10|sunfire.query.lse2-image-store+lse2-media-online|HTTP.QPS+HSF.QPS.analysis|key:sort_desc.unsupported|stars:3

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
     * Session idle: notify that the session is complete.
     * Could also trigger a final MemPalace save if desired.
     */
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        try {
          await $`osascript -e 'display notification "Session idle - check MemPalace diary" with title "OpenCode MemPalace"'`
        } catch {
          // Notification failed silently — not critical
        }
      }
    },
  }
}
