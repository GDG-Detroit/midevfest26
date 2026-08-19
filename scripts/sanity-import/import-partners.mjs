/**
 * Import partners/sponsors into Sanity.
 *
 * Same contract as import-team.mjs: deterministic document IDs,
 * createOrReplace mutations, and soft-unpublish (never delete) for any partner
 * scoped to the target event that is missing from the source.
 *
 * Source rows come from scripts/sanity-import/data/partners-2026.json. Unlike
 * the team import, logo paths point into scripts/sanity-import/assets/, which
 * is gitignored — staged logos are transient, and once uploaded Sanity's CDN is
 * the source of truth for the image.
 *
 * Usage:
 *   # See what would happen — no writes, no uploads
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-partners.mjs --dry-run
 *
 *   # Load the roster against the 2026 event
 *   node --env-file=scripts/sanity-import/.env \
 *     scripts/sanity-import/import-partners.mjs --event-year=2026
 */
import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSanityClient,
  imageFieldFromAsset,
  partnerDocId,
  uploadImage,
} from './lib/sanity-client.mjs'
import {
  ACTIVE_PARTNER_STATUS,
  PARTNER_STATUSES,
  PARTNER_TIERS,
  isKnownLogoSurface,
  isKnownPartnerStatus,
  isKnownPartnerTier,
} from './lib/partner-tiers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEFAULT_ROWS = 'scripts/sanity-import/data/partners-2026.json'
/** Logo paths on each row are relative to this. */
const ASSET_BASE = 'scripts/sanity-import/assets'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

/**
 * A row whose logo is already a URL came from generated data, not from the
 * staged assets — partners.js is a passthrough now, so re-extracting it yields
 * CDN links. Those are not filesystem paths and must never be fed to readFile;
 * the asset they name is already in Sanity.
 */
function isRemoteAsset(value) {
  return /^https?:\/\//i.test(value)
}

/** Absolute path every logo must resolve inside. */
const ASSET_ROOT = path.resolve(ROOT, ASSET_BASE)

/**
 * Logo paths come from row data, and row data is a JSON file anyone can edit —
 * so they are untrusted input to `readFile` and then to `uploadImage`. Sanity
 * serves assets from a public CDN, which turns "read any local file" into
 * "publish any local file". `../` chains, absolute paths, and symlinks out of
 * the tree are all rejected rather than clamped.
 */
function assertContainedAssetPath(assetPath, label) {
  if (path.isAbsolute(assetPath)) {
    throw new Error(
      `${label}: logo path must be relative to ${ASSET_BASE}/, got an ` +
        `absolute path (${assetPath})`
    )
  }

  const resolved = path.resolve(ASSET_ROOT, assetPath)
  const relative = path.relative(ASSET_ROOT, resolved)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label}: logo path escapes ${ASSET_BASE}/ (${assetPath})`)
  }

  return resolved
}

/**
 * Containment has to be rechecked after following symlinks: a link inside the
 * assets directory pointing anywhere is still a read of that target. Only
 * meaningful once the file exists, so a missing path falls through to the
 * normal "missing logo" handling.
 */
async function assertContainedRealPath(resolved, label) {
  const real = await realpath(resolved).catch(() => null)
  if (real === null) return

  const relative = path.relative(ASSET_ROOT, real)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `${label}: logo path resolves outside ${ASSET_BASE}/ through a ` +
        `symlink (${real})`
    )
  }
}

/** Fields that must be a non-empty string for a row to be usable. */
const REQUIRED_STRINGS = ['slug', 'name', 'tier']
/** Fields that may be absent, but must be strings when present. */
const OPTIONAL_STRINGS = [
  'url',
  'description',
  'logo_path',
  'logo_alt',
  'logo_surface',
  'status',
]

/**
 * Reject rows the schema would not accept.
 *
 * Sanity's `options.list` only constrains the Studio dropdown — the write API
 * stores anything — so a typo'd tier lands in the dataset and then vanishes
 * from the site with no error at any layer. And the content lake is schemaless
 * at the API level, so a numeric `name` is stored as a number in a string
 * field; the Studio flags it only after the fact, and the site renders it.
 *
 * The seed JSON is committed and hand-editable, so this is the last gate before
 * the mutation.
 */
function assertValidRows(rows) {
  const problems = []
  const seenSlugs = new Set()

  rows.forEach((row, index) => {
    const label = typeof row?.name === 'string' ? row.name : `row ${index}`

    if (row == null || typeof row !== 'object') {
      problems.push(`row ${index}: not an object`)
      return
    }

    for (const field of REQUIRED_STRINGS) {
      const value = row[field]
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(
          `${label}: "${field}" must be a non-empty string, got ` +
            `${JSON.stringify(value)}`
        )
      }
    }

    for (const field of OPTIONAL_STRINGS) {
      const value = row[field]
      if (value != null && typeof value !== 'string') {
        problems.push(
          `${label}: "${field}" must be a string when present, got ` +
            `${JSON.stringify(value)}`
        )
      }
    }

    if (row.sort_order != null && !Number.isFinite(row.sort_order)) {
      problems.push(
        `${label}: "sort_order" must be a number, got ` +
          `${JSON.stringify(row.sort_order)}`
      )
    }

    if (typeof row.tier === 'string' && !isKnownPartnerTier(row.tier)) {
      problems.push(
        `${label}: tier "${row.tier}" is not one of ${PARTNER_TIERS.join(', ')}`
      )
    }

    if (
      typeof row.logo_surface === 'string' &&
      !isKnownLogoSurface(row.logo_surface)
    ) {
      problems.push(
        `${label}: logo surface "${row.logo_surface}" is not one of dark, light`
      )
    }

    if (typeof row.status === 'string' && !isKnownPartnerStatus(row.status)) {
      problems.push(
        `${label}: status "${row.status}" is not one of ` +
          PARTNER_STATUSES.join(', ')
      )
    }

    // Document IDs are derived from the slug, so a duplicate is not a duplicate
    // document — it is one document written twice, with the last row winning
    // and the earlier organization silently absent from the page.
    if (typeof row.slug === 'string' && row.slug.trim() !== '') {
      if (seenSlugs.has(row.slug)) {
        problems.push(`${label}: duplicate slug "${row.slug}"`)
      }
      seenSlugs.add(row.slug)
    }
  })

  if (problems.length === 0) return

  throw new Error(
    `${problems.length} problem(s) in the source rows:\n` +
      problems.map((p) => `    ${p}`).join('\n')
  )
}

/**
 * `existing` carries the document's current logo, filename, and status. These
 * are mutations by createOrReplace, so every field the replacement omits is
 * destroyed — a row whose staged logo is missing must inherit what is already
 * in Sanity rather than silently blanking it.
 *
 * Status inherits for a different reason: it is editorial, set in Studio, and
 * the seed file has no opinion about it. Without this, reseeding would drag
 * every lapsed sponsor and open prospect back onto the live site. A row that
 * does name a status still wins — that is how the import corrects one.
 */
function buildPartnerPatch(row, eventRef, logoField, namespace, existing) {
  const localFilename =
    row.logo_path && !isRemoteAsset(row.logo_path)
      ? path.basename(row.logo_path)
      : undefined

  const patch = {
    _id: partnerDocId(row.slug, namespace),
    _type: 'partner',
    event: eventRef,
    name: row.name,
    slug: { _type: 'slug', current: row.slug },
    tier: row.tier,
    status: row.status || existing?.status || ACTIVE_PARTNER_STATUS,
    logoSurface: row.logo_surface || 'dark',
    sortOrder: row.sort_order ?? 0,
    published: true,
    importKey: row.slug,
    logoFilename: localFilename ?? existing?.logoFilename ?? '',
  }

  if (row.url) patch.url = row.url
  if (row.description) patch.description = row.description
  if (logoField) {
    patch.logo = { ...logoField, alt: row.logo_alt || row.name }
  }

  return patch
}

/**
 * Refuse to hijack another event's documents.
 *
 * Without `--id-namespace` a partner's ID is just `partner-<slug>`, which is
 * deliberate — the live event owns the unnamespaced IDs, same as speakers and
 * team. The trap is that the next event reuses those IDs: importing 2027
 * without a namespace would `createOrReplace` the 2026 documents and move their
 * event reference, so 2026's logos vanish from a page nobody was editing and
 * the only visible symptom is a shorter grid.
 *
 * Renaming the IDs would orphan every document already in the dataset, so the
 * fix is to make the collision loud instead. This is the one moment the
 * information exists: the documents have been read, nothing has been written.
 */
function assertNoCrossEventCollision(existingDocs, eventRef, namespace) {
  const collisions = existingDocs.filter(
    (doc) => doc.eventRef && doc.eventRef !== eventRef._ref
  )

  if (collisions.length === 0) return

  const hint = namespace
    ? `The namespace "${namespace}" is already in use by that event.`
    : 'Pass --id-namespace=<year> to scope this import to its own documents.'

  throw new Error(
    `${collisions.length} document(s) already belong to a different event ` +
      `(importing would move them to ${eventRef._ref}):\n` +
      collisions
        .map((doc) => `    ${doc.name ?? doc._id} — currently ${doc.eventRef}`)
        .join('\n') +
      `\n  ${hint}`
  )
}

async function resolveEventRef(client, { eventId, eventYear }) {
  if (eventId) return { _type: 'reference', _ref: eventId }

  if (!eventYear)
    throw new Error('Set --event-year, SANITY_EVENT_ID, or SANITY_EVENT_YEAR')

  const year = Number(eventYear)
  const existing = await client.fetch(
    `*[_type == "event" && year == $year][0]._id`,
    { year }
  )

  if (!existing) {
    throw new Error(
      `No event document for year ${year}. Create it in Studio first.`
    )
  }

  return { _type: 'reference', _ref: existing }
}

export async function importPartners(options = {}) {
  const {
    rowsPath = DEFAULT_ROWS,
    namespace,
    dryRun = false,
    strict = false,
  } = options

  const projectId = options.projectId ?? requireEnv('SANITY_PROJECT_ID')
  const dataset = options.dataset ?? requireEnv('SANITY_DATASET')
  const token = options.token ?? requireEnv('SANITY_API_TOKEN')

  const client = createSanityClient({ projectId, dataset, token })

  const rows = JSON.parse(await readFile(path.resolve(ROOT, rowsPath), 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No rows found in ${rowsPath}`)
  }

  // Before anything touches the dataset: malformed rows are a source-data
  // problem, and importing half a roster before noticing helps nobody.
  assertValidRows(rows)

  const eventRef = await resolveEventRef(client, {
    eventId: options.eventId,
    eventYear: options.eventYear ?? process.env.SANITY_EVENT_YEAR,
  })

  const partnerIds = rows.map((row) => partnerDocId(row.slug, namespace))

  // What is already stored, so a replacement can inherit assets it cannot
  // resolve locally instead of wiping them.
  const existingDocs = await client.fetch(
    `*[_id in $ids]{_id, logo, logoFilename, status, name, "eventRef": event._ref}`,
    { ids: partnerIds }
  )
  const existingById = new Map(existingDocs.map((doc) => [doc._id, doc]))

  assertNoCrossEventCollision(existingDocs, eventRef, namespace)

  const missingLogos = []
  const preservedLogos = []
  const imageCache = new Map()
  const mutations = []

  for (const row of rows) {
    const docId = partnerDocId(row.slug, namespace)
    const existing = existingById.get(docId)
    const assetPath = row.logo_path?.trim()

    let logoField = existing?.logo ?? null

    if (assetPath && isRemoteAsset(assetPath)) {
      // Already a Sanity asset; keep whatever the document has.
      preservedLogos.push(`${row.name} (remote URL in source)`)
    } else if (assetPath) {
      const absolute = assertContainedAssetPath(assetPath, row.name)
      await assertContainedRealPath(absolute, row.name)
      const filename = path.basename(assetPath)

      if (!imageCache.has(assetPath)) {
        const buffer = await readFile(absolute).catch(() => null)
        if (!buffer) {
          imageCache.set(assetPath, { missing: true })
        } else if (dryRun) {
          imageCache.set(assetPath, { resolved: true })
        } else {
          imageCache.set(assetPath, {
            asset: await uploadImage(client, buffer, filename),
          })
        }
      }

      const cached = imageCache.get(assetPath)
      if (cached.missing) {
        missingLogos.push(`${row.name} (${assetPath})`)
        if (existing?.logo) {
          preservedLogos.push(`${row.name} (staged file missing)`)
        }
      } else if (cached.asset) {
        logoField = imageFieldFromAsset(cached.asset)
      }
    }

    mutations.push({
      createOrReplace: buildPartnerPatch(
        row,
        eventRef,
        logoField,
        namespace,
        existing
      ),
    })
  }

  if (strict && missingLogos.length > 0) {
    throw new Error(
      `${missingLogos.length} logo file(s) could not be read (--strict):\n` +
        missingLogos.map((m) => `    ${m}`).join('\n')
    )
  }

  const stale = await client.fetch(
    `*[_type == "partner" && event._ref == $eventId && !(_id in $ids) && published == true]{_id, name}`,
    { eventId: eventRef._ref, ids: partnerIds }
  )

  const tiers = new Map()
  for (const row of rows) {
    tiers.set(row.tier, (tiers.get(row.tier) ?? 0) + 1)
  }

  // Effective status, not the seed's — most rows inherit it from Studio, so
  // this is the only place that knows who will actually be off the site.
  const parked = mutations
    .map(({ createOrReplace }) => createOrReplace)
    .filter((doc) => doc.status !== ACTIVE_PARTNER_STATUS)
    .map((doc) => `${doc.name} (${doc.status})`)

  const result = {
    dataset,
    eventId: eventRef._ref,
    partners: rows.length,
    parked,
    // Reported in page order, not insertion order, so the summary reads like
    // the grid it produces.
    tiers: PARTNER_TIERS.filter((tier) => tiers.has(tier)).map(
      (tier) => `${tier}: ${tiers.get(tier)}`
    ),
    logos: [...imageCache.values()].filter((v) => v.asset).length,
    missingLogos,
    preservedLogos,
    willUnpublish: stale.map((doc) => `partner: ${doc.name}`),
  }

  if (dryRun) return { ...result, dryRun: true }

  await client.mutate(mutations, { visibility: 'sync' })

  const unpublish = stale.map((doc) => ({
    patch: { id: doc._id, set: { published: false } },
  }))
  if (unpublish.length > 0) await client.mutate(unpublish)

  return result
}

function parseArgs(argv) {
  const args = { flags: new Set() }
  for (const arg of argv) {
    const withValue = /^--([^=]+)=(.*)$/.exec(arg)
    if (withValue) args[withValue[1]] = withValue[2]
    else if (arg.startsWith('--')) args.flags.add(arg.slice(2))
  }
  return args
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const args = parseArgs(process.argv.slice(2))

  importPartners({
    rowsPath: args.rows,
    eventYear: args['event-year'],
    namespace: args['id-namespace'],
    dryRun: args.flags.has('dry-run'),
    strict: args.flags.has('strict'),
  })
    .then((result) => {
      const label = result.dryRun ? 'Dry run' : 'Import complete'
      console.log(
        `\n${label} — dataset ${result.dataset}, event ${result.eventId}`
      )
      console.log(`  partners: ${result.partners} (${result.tiers.join(', ')})`)
      if (!result.dryRun) console.log(`  logos uploaded: ${result.logos}`)

      if (result.parked.length > 0) {
        console.log(`  ${result.parked.length} not active, so not on the site:`)
        for (const p of result.parked) console.log(`    ${p}`)
      }

      if (result.missingLogos.length > 0) {
        console.warn(`  missing logo files (${result.missingLogos.length}):`)
        for (const m of result.missingLogos) console.warn(`    ${m}`)
      }
      if (result.preservedLogos.length > 0) {
        console.log(
          `  kept the stored logo for ${result.preservedLogos.length}:`
        )
        for (const p of result.preservedLogos) console.log(`    ${p}`)
      }
      if (result.willUnpublish.length > 0) {
        const verb = result.dryRun ? 'would be unpublished' : 'unpublished'
        console.log(`  ${result.willUnpublish.length} existing docs ${verb}:`)
        for (const d of result.willUnpublish) console.log(`    ${d}`)
      }
    })
    .catch((error) => {
      console.error('Import failed:', error.message)
      process.exit(1)
    })
}
