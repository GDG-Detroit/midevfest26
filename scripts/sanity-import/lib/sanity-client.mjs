/**
 * Shared Sanity client + deterministic document IDs for idempotent imports.
 */
import { createClient } from '@sanity/client'

export function createSanityClient({ projectId, dataset, token }) {
  if (!projectId || !dataset || !token) {
    throw new Error(
      'Missing SANITY_PROJECT_ID, SANITY_DATASET, or SANITY_API_TOKEN'
    )
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2026-06-01',
    useCdn: false,
  })
}

export const speakerDocId = (slug) => `speaker-${slug}`
export const sessionDocId = (slug) => `session-${slug}`

export function slugRef(type, slug, idFn) {
  return {
    _type: 'reference',
    _ref: idFn(slug),
    _weak: true,
  }
}

export async function uploadImage(client, buffer, filename) {
  return client.assets.upload('image', buffer, { filename })
}

export function imageFieldFromAsset(asset) {
  return {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: asset._id,
    },
  }
}

/** Parse comma-separated tags; drop empty cells. */
export function parseTags(value) {
  if (!value || typeof value !== 'string') return undefined
  const tags = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : undefined
}

export function parseBoolean(value) {
  if (value === true || value === false) return value
  if (typeof value !== 'string') return false
  return ['true', 'yes', '1', 'y'].includes(value.trim().toLowerCase())
}

export function parseNumber(value) {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}
