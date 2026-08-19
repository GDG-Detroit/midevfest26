import {defineField, defineType} from 'sanity'

/**
 * Partners and sponsors are one document type separated by `tier`, not two
 * schemas. An organization that upgrades from community partner to paying
 * sponsor is a field edit, not a re-entry under a different type.
 *
 * The tier list is a hard constraint shared with the import script and the
 * build-time fetch — see PARTNER_TIERS in
 * scripts/sanity-import/lib/partner-tiers.mjs. Adding a tier is a three-step
 * change, in this order: add it to PARTNER_TIERS, add a display entry to
 * TIER_DISPLAY in src/layouts/PartnersSection.jsx (heading, slot count, shape),
 * then add it here. A tier that exists here but nowhere else saves cleanly in
 * Studio and then renders nowhere, with no error at any layer.
 */
const TIER_OPTIONS = [
  {title: 'Diamond', value: 'diamond'},
  {title: 'Platinum', value: 'platinum'},
  {title: 'Gold', value: 'gold'},
  {title: 'Community', value: 'community'},
  {title: 'Media', value: 'media'},
  {title: 'Fuel', value: 'fuel'},
]

const TIER_LABELS: Record<string, string> = Object.fromEntries(
  TIER_OPTIONS.map(({title, value}) => [value, title])
)

function tierLabel(value: string | undefined): string | undefined {
  if (!value) return undefined
  return TIER_LABELS[value] ?? value
}

/**
 * Where an organization stands with us, which is a different question from
 * `tier` (which row of the grid their logo sits in). Keeping them apart is the
 * point: a Gold sponsor who does not renew becomes `lapsed` while staying Gold,
 * so bringing them back is one field, not a guess about what they used to be.
 *
 * Only `active` reaches the site. Mirrors PARTNER_STATUSES in
 * scripts/sanity-import/lib/partner-tiers.mjs.
 */
const STATUS_OPTIONS = [
  {title: 'Active — shows on the site', value: 'active'},
  {title: 'Prospect — in conversation', value: 'prospect'},
  {title: 'Lapsed — sponsored before, not this year', value: 'lapsed'},
  {title: 'Declined — not sponsoring', value: 'declined'},
]

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  prospect: 'Prospect',
  lapsed: 'Lapsed',
  declined: 'Declined',
}

function statusLabel(value: string | undefined): string | undefined {
  // Documents predating this field are active — same default the fetch applies.
  if (!value || value === 'active') return undefined
  return STATUS_LABELS[value] ?? value
}

export const partner = defineType({
  name: 'partner',
  title: 'Partner / sponsor',
  type: 'document',
  groups: [
    {name: 'profile', title: 'Profile', default: true},
    {name: 'logo', title: 'Logo'},
    {name: 'import', title: 'Import'},
  ],
  fields: [
    defineField({
      name: 'event',
      title: 'Event',
      type: 'reference',
      to: [{type: 'event'}],
      validation: (rule) => rule.required(),
      group: 'profile',
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'profile',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
      description: 'Stable key for imports (e.g. techtown-detroit).',
      group: 'profile',
    }),
    defineField({
      name: 'tier',
      title: 'Tier',
      type: 'string',
      options: {list: TIER_OPTIONS},
      validation: (rule) => rule.required(),
      description: 'Which row of the sponsors grid this organization appears in.',
      group: 'profile',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {list: STATUS_OPTIONS},
      initialValue: 'active',
      validation: (rule) => rule.required(),
      description:
        'Only Active organizations appear on the site. Park a prospect or a lapsed sponsor here rather than deleting them — their tier, logo, and links are kept for when they come back.',
      group: 'profile',
    }),
    defineField({
      name: 'url',
      title: 'Website',
      type: 'url',
      description: 'Optional. When set, the logo becomes a link.',
      group: 'profile',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description:
        'Not rendered in the sponsors grid today. Kept for press use and for a future detail view.',
      group: 'profile',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      initialValue: 0,
      description: 'Lower numbers appear first within a tier.',
      group: 'profile',
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
      description:
        'Import bookkeeping, not an editorial choice — the import clears this for organizations that vanish from its source. To take a sponsor off the site, set Status instead. Both have to pass for a logo to render.',
      group: 'profile',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: {hotspot: false},
      group: 'logo',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'Describes the logo for screen readers. Falls back to the organization name when blank.',
        }),
      ],
    }),
    defineField({
      name: 'logoSurface',
      title: 'Logo surface',
      type: 'string',
      options: {
        list: [
          {title: 'Dark tile (default)', value: 'dark'},
          {title: 'Light tile', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
      description:
        'Pick "Light tile" for logos with dark ink that would disappear on the dark tile.',
      group: 'logo',
    }),
    defineField({
      name: 'importKey',
      title: 'Import key',
      type: 'string',
      readOnly: true,
      group: 'import',
    }),
    defineField({
      name: 'logoFilename',
      title: 'Logo filename',
      type: 'string',
      group: 'import',
      description: 'Source filename used on last import (e.g. dia-techtown-300x.webp).',
    }),
  ],
  orderings: [
    {
      title: 'Tier, then sort order',
      name: 'tierAndSortOrder',
      by: [
        {field: 'tier', direction: 'asc'},
        {field: 'sortOrder', direction: 'asc'},
        {field: 'name', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {
      title: 'name',
      tier: 'tier',
      media: 'logo',
      year: 'event.year',
      published: 'published',
      status: 'status',
    },
    prepare: ({title, tier, media, year, published, status}) => ({
      title: title ?? 'Unnamed partner',
      subtitle: [
        year,
        tierLabel(tier),
        statusLabel(status),
        published === false ? 'unpublished' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
