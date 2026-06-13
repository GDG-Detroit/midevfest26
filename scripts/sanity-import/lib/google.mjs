import {google} from 'googleapis'

export async function createGoogleClients(credentialsPath) {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })

  const authClient = await auth.getClient()

  return {
    sheets: google.sheets({version: 'v4', auth: authClient}),
    drive: google.drive({version: 'v3', auth: authClient}),
  }
}

/**
 * Read all rows from the first sheet (or named sheet) as array of objects keyed by header row.
 */
export async function readSheetRows(sheets, {spreadsheetId, range = 'Sheet1'}) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  const values = response.data.values ?? []
  if (values.length < 2) return []

  const headers = values[0].map((h) => String(h).trim())
  return values.slice(1).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = row[index] != null ? String(row[index]).trim() : ''
    })
    return record
  })
}

/**
 * Download a file from a Drive folder by exact filename.
 */
export async function downloadFileByName(drive, {folderId, filename}) {
  if (!filename) return null

  const list = await drive.files.list({
    q: [
      `'${folderId}' in parents`,
      `name = '${filename.replace(/'/g, "\\'")}'`,
      'trashed = false',
    ].join(' and '),
    fields: 'files(id, name, mimeType)',
    pageSize: 1,
  })

  const file = list.data.files?.[0]
  if (!file?.id) return null

  const media = await drive.files.get(
    {fileId: file.id, alt: 'media'},
    {responseType: 'arraybuffer'}
  )

  return Buffer.from(media.data)
}
