/**
 * Trigger.dev v4 configuration.
 *
 * SETUP REQUIRED:
 *   1. Create a project at https://cloud.trigger.dev
 *   2. Replace "proj_YOUR_PROJECT_ID" below with your real project ref
 *      (found in: Trigger.dev dashboard → project settings → Project ID)
 *   3. Add TRIGGER_SECRET_KEY to Vercel env vars
 *      (found in: Trigger.dev dashboard → project settings → API Keys)
 *   4. Deploy tasks: npx trigger.dev@latest deploy
 */
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project:     process.env.TRIGGER_PROJECT_ID ?? 'proj_YOUR_PROJECT_ID',
  dirs:        ['./trigger'],
  maxDuration: 600, // 10 minutes (task-level override via maxDuration in task() takes precedence)
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts:      2,
      minTimeoutInMs:   2_000,
      maxTimeoutInMs:   30_000,
      factor:           2,
      randomize:        true,
    },
  },
})
