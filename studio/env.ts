const DEFAULT_PROJECT_ID = 'b18a6pbd'
const DEFAULT_DATASET = 'production'

function trimEnv(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/** Sanity project ID (override with SANITY_STUDIO_PROJECT_ID). */
export const projectId = trimEnv(process.env.SANITY_STUDIO_PROJECT_ID) ?? DEFAULT_PROJECT_ID

/**
 * Target dataset. Defaults to `production`.
 * Override with SANITY_STUDIO_DATASET when needed.
 *
 * Use direct `process.env.SANITY_STUDIO_*` access so Vite can inline values at build time.
 */
export const dataset = trimEnv(process.env.SANITY_STUDIO_DATASET) ?? DEFAULT_DATASET

export const studioTitle = dataset === 'production' ? 'pridemi26' : `pridemi26 (${dataset})`
