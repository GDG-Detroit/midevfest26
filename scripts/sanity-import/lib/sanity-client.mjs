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

/**
 * Document IDs are derived from the slug so imports are idempotent.
 *
 * `namespace` scopes an ID to one event, which is what lets the same person
 * appear under more than one event — the 2025 archive and the 2026 placeholder
 * program are the same 47 humans, and without a namespace the second import
 * would overwrite the first and move its event reference. Omit it to keep the
 * original unnamespaced IDs (the live event, written by import-speakers.mjs).
 */
export const speakerDocId = (slug, namespace) =>
  namespace ? `speaker-${namespace}-${slug}` : `speaker-${slug}`
export const sessionDocId = (slug, namespace) =>
  namespace ? `session-${namespace}-${slug}` : `session-${slug}`

export function slugRef(type, slug, idFn, namespace) {
  return {
    _type: 'reference',
    _ref: idFn(slug, namespace),
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
