const STORAGE_KEY = 'cbdComicDatabase';
const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' },
    { code: 'sv', name: 'Svenska' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' }
];

function loadComicDatabase() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Could not parse saved comic database:', error);
        return [];
    }
}

function saveComicDatabase(comics) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comics));
}

function getNextId(comics) {
    return comics.reduce((max, comic) => {
        const id = Number(comic.id) || 0;
        return Math.max(max, id);
    }, 0) + 1;
}

function getComicById(id) {
    const comics = loadComicDatabase();
    return comics.find(comic => String(comic.id) === String(id));
}

function updateComicById(id, updatedComic) {
    const comics = loadComicDatabase();
    const index = comics.findIndex(comic => String(comic.id) === String(id));
    if (index === -1) {
        return false;
    }
    comics[index] = { ...comics[index], ...updatedComic, id: Number(id) };
    saveComicDatabase(comics);
    return true;
}

function deleteComicById(id) {
    const comics = loadComicDatabase();
    const updated = comics.filter(comic => String(comic.id) !== String(id));
    saveComicDatabase(updated);
    return updated;
}

function normalizeComicInput(input) {
    const issueNumber = Number.parseInt(input.issueNumber, 10);
    const publicationYear = Number.parseInt(input.publicationYear, 10);

    return {
        id: input.id != null ? Number(input.id) : undefined,
        seriesTitle: String(input.seriesTitle || '').trim(),
        issueTitle: String(input.issueTitle || '').trim(),
        issueNumber: Number.isNaN(issueNumber) ? null : issueNumber,
        writers: Array.isArray(input.writers)
            ? input.writers.map(writer => String(writer).trim()).filter(Boolean)
            : String(input.writers || '')
                    .split(',')
                    .map(writer => writer.trim())
                    .filter(Boolean),
        artists: Array.isArray(input.artists)
            ? input.artists.map(artist => String(artist).trim()).filter(Boolean)
            : String(input.artists || '')
                    .split(',')
                    .map(artist => artist.trim())
                    .filter(Boolean),
        language: String(input.language || '').trim(),
        publisher: String(input.publisher || '').trim(),
        publicationYear: Number.isNaN(publicationYear) ? null : publicationYear
    };
}

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

function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i += 1;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        field += char;
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.map(r => r.map(cell => String(cell || '').trim()));
}

async function importFromGoogleSheets() {
    const sheetUrl = prompt(t('messages.import.promptUrl', 'Paste the shared Google Sheets URL:'));
    if (!sheetUrl) {
        return;
    }

    const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
    const response = await fetch(url);
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

    const rows = parseCsv(csvText).filter(row => row.some(value => String(value || '').trim() !== ''));
    const dataRows = rows.slice(1);
    const validComics = [];

    for (const rowData of dataRows) {
        const seriesTitle = rowData[1] || '';
        const issueTitle = rowData[0] || '';
        if (!seriesTitle.trim() && !issueTitle.trim()) {
            continue;
        }

        validComics.push({
            id: null,
            issueTitle: issueTitle.trim(),
            seriesTitle: seriesTitle.trim(),
            issueNumber: Number.parseInt(rowData[2], 10) || null,
            writers: String(rowData[3] || '').split(',').map(value => value.trim()).filter(Boolean),
            artists: String(rowData[4] || '').split(',').map(value => value.trim()).filter(Boolean),
            publicationYear: Number.parseInt(rowData[5], 10) || null,
            language: String(rowData[6] || '').trim(),
            publisher: String(rowData[7] || '').trim()
        });
    }

    if (!validComics.length) {
        throw new Error('No valid comic rows found. Check sheet columns and ensure at least series or issue title is present.');
    }

    const comics = loadComicDatabase();
    let nextId = getNextId(comics);
    validComics.forEach(comic => {
        comic.id = nextId++;
        comics.push(comic);
    });

    saveComicDatabase(comics);
    return {
        importedCount: validComics.length,
        totalCount: comics.length
    };
}

window.APP = {
    loadComicDatabase,
    saveComicDatabase,
    getNextId,
    getComicById,
    updateComicById,
    deleteComicById,
    normalizeComicInput,
    importFromGoogleSheets,
    AVAILABLE_LANGUAGES
};
