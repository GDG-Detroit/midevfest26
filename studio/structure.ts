import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
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
        .child(
          S.documentTypeList('session')
            .title('Sessions')
            .defaultOrdering([{field: 'startTime', direction: 'asc'}])
        ),
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
    ])
