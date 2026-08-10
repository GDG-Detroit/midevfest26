import {defineField, defineType} from 'sanity'

/**
 * Only groups the site actually renders belong here.
 *
 * Home.jsx mounts OrganizersSection, which filters to these two. Offering a
 * group with no section is a trap: the choice saves cleanly, validates, and
 * then the person never appears anywhere, with no error at any layer. This list
 * previously carried 'facilitator', 'board' and 'marketing' for sections that
 * do not exist.
 *
 * Adding a group is a two-step change, in this order: build and mount the
 * section, then add the option here and to RENDERED_TEAM_GROUPS in
 * scripts/sanity-import/lib/team-groups.mjs.
 */
const TEAM_GROUP_OPTIONS = [
  {title: 'Compass organizers', value: 'compass'},
  {title: 'Dev team', value: 'devteam'},
]

const TEAM_GROUP_LABELS: Record<string, string> = Object.fromEntries(
  TEAM_GROUP_OPTIONS.map(({title, value}) => [value, title])
)

function teamGroupLabel(value: string | undefined): string | undefined {
  if (!value) return undefined
  return TEAM_GROUP_LABELS[value] ?? value
}

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  groups: [
    {name: 'profile', title: 'Profile', default: true},
    {name: 'social', title: 'Social'},
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
      description: 'Stable key for imports (e.g. jenna-ritten).',
      group: 'profile',
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      group: 'profile',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Title shown on the card (e.g. Executive Director, UX Engineer).',
      group: 'profile',
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'string',
      group: 'profile',
    }),
    defineField({
      name: 'university',
      title: 'University',
      type: 'string',
      group: 'profile',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 6,
      group: 'profile',
    }),
    defineField({
      name: 'teamGroup',
      title: 'Team group',
      type: 'string',
      options: {list: TEAM_GROUP_OPTIONS},
      validation: (rule) => rule.required(),
      description: 'Which section of the site this person appears in.',
      group: 'profile',
    }),
    defineField({
      name: 'commits',
      title: 'Commit count',
      type: 'number',
      description:
        'Optional. Shown as “Core Contributor” on the leadership team when greater than 0.',
      group: 'profile',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      initialValue: 0,
      description: 'Lower numbers appear first within a team group.',
      group: 'profile',
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
      group: 'profile',
    }),
    defineField({
      name: 'linkedIn',
      title: 'LinkedIn URL',
      type: 'url',
      group: 'social',
    }),
    defineField({
      name: 'twitter',
      title: 'Twitter handle',
      type: 'string',
      group: 'social',
    }),
    defineField({
      name: 'github',
      title: 'GitHub URL or username',
      type: 'string',
      group: 'social',
    }),
    defineField({
      name: 'importKey',
      title: 'Import key',
      type: 'string',
      readOnly: true,
      group: 'import',
    }),
    defineField({
      name: 'headshotFilename',
      title: 'Headshot filename',
      type: 'string',
      group: 'import',
      description: 'Drive filename used on last import (e.g. jenna_ritten.webp).',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      group: 'teamGroup',
      media: 'headshot',
      year: 'event.year',
    },
    prepare: ({title, subtitle, group, media, year}) => ({
      title: title ?? 'Unnamed team member',
      subtitle: [year, teamGroupLabel(group), subtitle].filter(Boolean).join(' · '),
      media,
    }),
  },
})
