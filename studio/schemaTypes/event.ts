import {defineField, defineType} from 'sanity'

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'e.g. Detroit Pride Innovation Summit 2026',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (rule) => rule.required().integer().min(2020).max(2100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sheetId',
      title: 'Google Sheet ID',
      type: 'string',
      description: 'Runner master sheet for n8n import (optional if stored in n8n).',
    }),
    defineField({
      name: 'driveFolderId',
      title: 'Google Drive folder ID',
      type: 'string',
      description: 'Headshots folder for this event year (FirstnameLastname.jpg).',
    }),
    defineField({
      name: 'timezone',
      title: 'Timezone',
      type: 'string',
      initialValue: 'America/Detroit',
      description: 'Session times are interpreted in this timezone.',
    }),
  ],
  preview: {
    select: {title: 'title', year: 'year'},
    prepare: ({title, year}) => ({
      title: title ?? 'Untitled event',
      subtitle: year ? String(year) : undefined,
    }),
  },
})
