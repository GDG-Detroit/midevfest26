import type {StructureResolver} from 'sanity/structure'

/** Filtered document lists pin an API version; keep it with the import scripts'. */
const SANITY_API_VERSION = '2026-06-01'

const SESSION_ORDERING = [{field: 'startTime', direction: 'asc' as const}]

const PARTNER_ORDERING = [
  {field: 'tier', direction: 'asc' as const},
  {field: 'sortOrder', direction: 'asc' as const},
  {field: 'name', direction: 'asc' as const},
]

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.listItem().title('Events').child(S.documentTypeList('event').title('Events')),
      S.divider(),
      S.listItem()
        .title('Speakers')
        .child(
          S.documentTypeList('speaker')
            .title('Speakers')
            .defaultOrdering([{field: 'name', direction: 'asc'}])
        ),
      S.listItem()
        .title('Sessions')
        .child(async () => {
          // Years come from the Event documents, so a new event year shows up
          // here without a code change.
          const events = await context
            .getClient({apiVersion: SANITY_API_VERSION})
            .fetch<{_id: string; year: number}[]>(
              '*[_type == "event" && defined(year)] | order(year desc){_id, year}'
            )

          return S.list()
            .title('Sessions')
            .items([
              ...events.map(({_id, year}) =>
                S.listItem()
                  .id(`sessions-${year}`)
                  .title(String(year))
                  .child(
                    S.documentList()
                      .id(`sessions-${year}-list`)
                      .title(`Sessions ${year}`)
                      .schemaType('session')
                      .apiVersion(SANITY_API_VERSION)
                      .filter('_type == "session" && event._ref == $eventId')
                      .params({eventId: _id})
                      .defaultOrdering(SESSION_ORDERING)
                      // New sessions created from inside a year start on that
                      // year's event, so they cannot land in the wrong year.
                      .initialValueTemplates([
                        S.initialValueTemplateItem('session-for-event', {eventId: _id}),
                      ])
                  )
              ),
              S.divider(),
              S.listItem()
                .title('All sessions')
                .child(
                  S.documentTypeList('session')
                    .title('All sessions')
                    .defaultOrdering(SESSION_ORDERING)
                ),
            ])
        }),
      S.listItem()
        .title('Team')
        .child(
          S.documentTypeList('teamMember')
            .title('Team members')
            .defaultOrdering([
              {field: 'teamGroup', direction: 'asc'},
              {field: 'sortOrder', direction: 'asc'},
              {field: 'name', direction: 'asc'},
            ])
        ),
      S.listItem()
        .title('Partners')
        .child(
          S.list()
            .title('Partners & sponsors')
            .items([
              S.listItem().title('Active').child(
                S.documentList()
                  .title('On the site')
                  .schemaType('partner')
                  .apiVersion(SANITY_API_VERSION)
                  // Documents predating the status field have none, and the
                  // build-time fetch reads that as active — this list has to
                  // agree, or organizations that are live would be missing
                  // from the list an editor works in.
                  .filter('_type == "partner" && (!defined(status) || status == "active")')
                  .defaultOrdering(PARTNER_ORDERING)
              ),
              S.listItem()
                .title('Pipeline & past')
                .child(
                  S.documentList()
                    .title('Not on the site')
                    .schemaType('partner')
                    .apiVersion(SANITY_API_VERSION)
                    .filter('_type == "partner" && defined(status) && status != "active"')
                    .defaultOrdering(PARTNER_ORDERING)
                ),
              S.divider(),
              S.listItem()
                .title('All partners')
                .child(
                  S.documentTypeList('partner')
                    .title('All partners & sponsors')
                    .defaultOrdering(PARTNER_ORDERING)
                ),
            ])
        ),
    ])
