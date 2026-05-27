const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');

function getSpreadsheetIdFromUrl(sheetUrl) {
    if (!sheetUrl || typeof sheetUrl !== 'string') {
        throw new Error('A Google Sheets URL is required');
    }

    let parsed;
    try {
        parsed = new URL(sheetUrl.trim());
    } catch {
        throw new Error('Invalid URL format');
    }

    if (!parsed.hostname.includes('docs.google.com')) {
        throw new Error('URL must be a docs.google.com Google Sheets link');
    }

    const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        throw new Error('Could not find spreadsheet ID in URL');
    }

    return match[1];
}

async function importFromGoogleSheets(sheetUrl) {
    try {
        const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
        
        const response = await fetch(url, { redirect: 'follow' });
        if (!response.ok) {
            throw new Error(`Google Sheets request failed with status ${response.status}`);
        }
        const csvText = await response.text();
        const normalizedText = csvText.trim();

        if (!normalizedText) {
            throw new Error('The spreadsheet returned empty data');
        }
        if (normalizedText.startsWith('<!DOCTYPE html') || normalizedText.startsWith('<html')) {
            throw new Error('The spreadsheet is not publicly shared. Please share it with "Anyone with the link can view".');
        }

        const rows = parse(csvText, {
            columns: false,
            skip_empty_lines: true,
            trim: true
        }).slice(1);

        return rows
            .filter(row => Array.isArray(row) && row.some(value => String(value || '').trim() !== ''))
            .map(row => {
                const issueNumber = Number.parseInt(row[2], 10);
                const publicationYear = Number.parseInt(row[5], 10);

                return {
                    issueTitle: (row[0] || '').trim(), // tytuł
                    seriesTitle: (row[1] || '').trim(), // seria
                    issueNumber: Number.isNaN(issueNumber) ? null : issueNumber, // tom serii
                    writers: (row[3] || '').split(',').map(writer => writer.trim()).filter(Boolean), // scenariusz
                    artists: (row[4] || '').split(',').map(artist => artist.trim()).filter(Boolean), // rysunki
                    publicationYear: Number.isNaN(publicationYear) ? null : publicationYear, // data
                    language: (row[6] || '').trim(), // język
                    publisher: (row[7] || '').trim() // wydawca
                };
            });
    } catch (error) {
        console.error('Error importing from Google Sheets:', error);
        throw error;
    }
}

module.exports = {
    importFromGoogleSheets
}; 