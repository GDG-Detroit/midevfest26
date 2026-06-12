const DEFAULT_PROJECT_ID = 'b18a6pbd'
const DEFAULT_DATASET = 'development'

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/** Sanity project ID (override with SANITY_STUDIO_PROJECT_ID). */
export const projectId = readEnv('SANITY_STUDIO_PROJECT_ID') ?? DEFAULT_PROJECT_ID

/**
 * Target dataset. Defaults to `development` so local Studio does not write to production.
 * Set SANITY_STUDIO_DATASET=production for hosted Studio deploys.
 */
export const dataset = readEnv('SANITY_STUDIO_DATASET') ?? DEFAULT_DATASET

export const studioTitle = dataset === 'production' ? 'pridemi26' : `pridemi26 (${dataset})`
