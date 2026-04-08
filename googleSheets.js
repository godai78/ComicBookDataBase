const fetch = require('node-fetch');

async function importFromGoogleSheets() {
    try {
        const spreadsheetId = '1vqLZmGwyw61KHiQ9krTdZU24Og3DuAbV1_EVBdNnVo4';
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
        
        const response = await fetch(url);
        const csvText = await response.text();
        
        // Split into rows and remove the header row
        const rows = csvText.split('\n').slice(1);
        
        return rows.map(row => {
            // Split by comma, handling quoted values
            const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
            
            // Handle empty issue number
            const issueNumberStr = cleanValues[2] || '';
            const issueNumber = issueNumberStr ? parseInt(issueNumberStr) : null;
            
            return {
                issueTitle: cleanValues[0] || '', // tytuł
                seriesTitle: cleanValues[1] || '', // seria
                issueNumber: issueNumber, // tom serii
                writer: cleanValues[3] || '', // scenariusz
                artists: (cleanValues[4] || '').split(',').map(artist => artist.trim()), // rysunki
                publicationYear: parseInt(cleanValues[5]) || 0, // data
                language: cleanValues[6] || '', // język
                publisher: cleanValues[7] || '' // wydawca
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