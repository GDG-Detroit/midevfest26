import {defineArrayMember, defineField, defineType} from 'sanity'

export const session = defineType({
  name: 'session',
  title: 'Session',
  type: 'document',
  fields: [
    defineField({
      name: 'event',
      title: 'Event',
      type: 'reference',
      to: [{type: 'event'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Panel talks: use the same title on each panelist row in the runner sheet.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'abstract',
      title: 'Abstract',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 6,
    }),
    defineField({
      name: 'track',
      title: 'Track',
      type: 'string',
      description: 'Free text — tracks may change each event.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'e.g. In-person, Level Up',
    }),
    defineField({
      name: 'startTime',
      title: 'Start time',
      type: 'string',
      description: '24-hour Eastern time, e.g. 09:00 or 14:30',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          return /^\d{2}:\d{2}$/.test(value) ? true : 'Use HH:mm format (e.g. 09:00)'
        }),
    }),
    defineField({
      name: 'room',
      title: 'Room',
      type: 'string',
      description: 'Venue-specific room name (free text).',
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Duration (minutes)',
      type: 'number',
      initialValue: 60,
      validation: (rule) => rule.min(1).max(480),
    }),
    defineField({
      name: 'isPanel',
      title: 'Panel session',
      type: 'boolean',
      initialValue: false,
      description: 'Optional flag for organizer reference; site groups by matching title.',
    }),
    defineField({
      name: 'participants',
      title: 'Speakers',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sessionParticipant',
          fields: [
            defineField({
              name: 'speaker',
              title: 'Speaker',
              type: 'reference',
              to: [{type: 'speaker'}],
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'sortOrder',
              title: 'Sort order',
              type: 'number',
              description: 'Avatar order on session cards (lower first).',
              initialValue: 0,
            }),
          ],
          preview: {
            select: {title: 'speaker.name', media: 'speaker.headshot'},
          },
        }),
      ],
      validation: (rule) => rule.min(1).error('Every session needs at least one speaker.'),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'importKey',
      title: 'Import key',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      track: 'track',
      time: 'startTime',
      year: 'event.year',
    },
    prepare: ({title, track, time, year}) => ({
      title: title ?? 'Untitled session',
      subtitle: [year, track, time].filter(Boolean).join(' · '),
    }),
  },
})
