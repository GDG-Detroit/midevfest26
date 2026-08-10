/**
 * Team group vocabularies, shared by the import and the build-time fetch.
 *
 * These are deliberately equal right now. The schema used to offer five groups
 * while the site rendered two, which meant an organizer could pick "board" in
 * Studio, save it cleanly, and watch the person never appear — no error at any
 * layer. Narrowing the schema made that state unrepresentable rather than
 * merely detectable.
 *
 * They stay two separate constants because they answer different questions, and
 * they diverge again the moment legacy data outlives a group:
 *   - TEAM_GROUPS is a hard constraint. A value outside it is invalid data and
 *     the import refuses it before touching the dataset.
 *   - RENDERED_TEAM_GROUPS is a warning. The value is storable, the site just
 *     has nowhere to put it, so generation says so out loud instead of dropping
 *     the person silently.
 */

/** Mirrors TEAM_GROUP_OPTIONS in studio/schemaTypes/teamMember.ts. */
export const TEAM_GROUPS = ['compass', 'devteam']

/**
 * Groups that reach the page. Home.jsx renders OrganizersSection, which filters
 * to exactly these. Widen this only together with a section that renders the
 * new group, and with the schema's TEAM_GROUP_OPTIONS.
 */
export const RENDERED_TEAM_GROUPS = ['compass', 'devteam']

export function isKnownTeamGroup(value) {
  return TEAM_GROUPS.includes(value)
}

export function isRenderedTeamGroup(value) {
  return RENDERED_TEAM_GROUPS.includes(value)
}
