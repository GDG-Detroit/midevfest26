/**
 * Partner/sponsor tier vocabulary, shared by the import and the build-time fetch.
 *
 * Same reasoning as team-groups.mjs: Sanity's `options.list` only constrains the
 * Studio dropdown — the write API stores anything — so a tier the site has no
 * row for saves cleanly and then renders nowhere, with no error at any layer.
 *
 *   - PARTNER_TIERS is a hard constraint. A value outside it is invalid data and
 *     the import refuses it before touching the dataset.
 *   - RENDERED_PARTNER_TIERS is a warning. The value is storable, the grid just
 *     has no row for it, so generation says so out loud instead of dropping the
 *     organization silently.
 *
 * Order matters: it is the order tiers appear on the page.
 */

/** Mirrors TIER_OPTIONS in studio/schemaTypes/partner.ts. */
export const PARTNER_TIERS = [
  'diamond',
  'platinum',
  'gold',
  'community',
  'media',
  'fuel',
]

/**
 * Tiers that reach the page. Mirrors TIER_DISPLAY in
 * src/layouts/PartnersSection.jsx. Widen this only together with a display entry
 * for the new tier, and with the schema's TIER_OPTIONS.
 */
export const RENDERED_PARTNER_TIERS = [
  'diamond',
  'platinum',
  'gold',
  'community',
  'media',
  'fuel',
]

/** Logo tile backgrounds the component knows how to render. */
export const LOGO_SURFACES = ['dark', 'light']

/**
 * Where an organization stands with us — a different axis from tier, which is
 * only about which row of the grid a logo sits in. A lapsed Gold sponsor stays
 * Gold, so bringing them back is one field rather than a guess.
 *
 * Mirrors STATUS_OPTIONS in studio/schemaTypes/partner.ts.
 */
export const PARTNER_STATUSES = ['active', 'prospect', 'lapsed', 'declined']

/**
 * The only status that reaches the site.
 *
 * Documents written before this field existed have no status at all, and the
 * fetch treats missing as active — the field was introduced after 19 partners
 * were already live, and defaulting the other way would have emptied the grid.
 */
export const ACTIVE_PARTNER_STATUS = 'active'

export function isKnownPartnerStatus(value) {
  return PARTNER_STATUSES.includes(value)
}

/** Missing status means active; see ACTIVE_PARTNER_STATUS. */
export function isActivePartnerStatus(value) {
  return value == null || value === ACTIVE_PARTNER_STATUS
}

export function isKnownPartnerTier(value) {
  return PARTNER_TIERS.includes(value)
}

export function isRenderedPartnerTier(value) {
  return RENDERED_PARTNER_TIERS.includes(value)
}

export function isKnownLogoSurface(value) {
  return LOGO_SURFACES.includes(value)
}
