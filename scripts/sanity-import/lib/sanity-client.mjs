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
export const teamMemberDocId = (slug, namespace) =>
  namespace ? `team-${namespace}-${slug}` : `team-${slug}`
export const partnerDocId = (slug, namespace) =>
  namespace ? `partner-${namespace}-${slug}` : `partner-${slug}`

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

/**
 * Headshots already stored on the documents an import is about to replace.
 *
 * These imports use createOrReplace, which drops every field the replacement
 * omits. Since a patch only sets `headshot` when a fresh asset was resolved, a
 * source image that cannot be read — a renamed Drive file, a revoked folder
 * share, a missing local file — would otherwise erase a perfectly good stored
 * image. Feed the result to the patch builder so an unresolvable image inherits
 * what is already there instead of blanking it.
 *
 * Returns a Map of document id -> {headshot, headshotFilename}.
 */
export async function fetchStoredHeadshots(client, ids) {
  if (!ids || ids.length === 0) return new Map()

  const docs = await client.fetch(
    `*[_id in $ids]{_id, headshot, headshotFilename}`,
    { ids }
  )

  return new Map(docs.map((doc) => [doc._id, doc]))
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
