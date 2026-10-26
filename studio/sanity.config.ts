import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {dataset, projectId, studioTitle} from './env'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: studioTitle,

  projectId,
  dataset,

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    templates: (templates) => [
      ...templates,
      {
        id: 'session-for-event',
        title: 'Session',
        schemaType: 'session',
        parameters: [{name: 'eventId', type: 'string'}],
        value: ({eventId}: {eventId: string}) => ({
          event: {_type: 'reference', _ref: eventId},
        }),
      },
    ],
  },
})
