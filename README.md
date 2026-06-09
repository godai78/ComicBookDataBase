# Comic Collection Manager

A web application for managing your comic collection. Built with Node.js and vanilla JavaScript. Vibe-coded by godai using Cursor.

## Changelog

See `CHANGELOG.md` for release history and notable updates.

## Features

- View and search your comic collection
- Add new comics with detailed information
- Edit existing comic entries
- Sort by any column (hierarchical: series → title → issue number)
- Dynamic search suggestions
- Import from Google Sheets using a pasted shared URL
- Export to CSV (compatible with Google Docs/Sheets)
- Record count display

## Installation

This project is now a static web app and can be hosted on any web server.

1. Upload the project files to your web host.
2. Serve the files from the site root or a subdirectory.
3. Open `index.html` in your browser.

To preview locally, you can use a simple static server:
```bash
python -m http.server 8000
```
Then visit:
```
http://localhost:8000/index.html
```

## Data Structure

Each comic entry contains:
- `id`
- `seriesTitle`
- `issueTitle`
- `issueNumber`
- `writers` (array)
- `artists` (array)
- `language`
- `publisher`
- `publicationYear`

For an empty database, `comics.json` should contain:

```json
[]
```

## Technologies Used

- Static HTML, CSS, and JavaScript
- Browser `localStorage` for persistence
- Google Sheets CSV import via client-side fetch

## Translations

The application supports multiple languages through a translation system. Currently available languages:
- English (en)
- Polish (pl)
- German (de)
- Swedish (sv)
- French (fr)

### Adding New Translations

To add a new language:

1. Create a new JSON file in the `translations` directory with the language code (e.g., `fr.json` for French)
2. Copy the structure from `en.json` and translate all values
3. The language will be automatically detected and added to the language selector

### Using Translations in HTML

To make an element translatable, add the `data-translate` attribute with the appropriate translation key:
```html
<label data-translate="comic.fields.series">Series</label>
```

For input placeholders:
```html
<input type="text" data-translate-placeholder="search.seriesPlaceholder" placeholder="Search by series name...">
```

### Translation Structure

The translation files follow this structure:
```json
{
    "app": {
        "pageTitle": "Comic collection manager",
        "recordCount": "({count} records)"
    },
    "search": {
        "title": "Search comics",
        "seriesPlaceholder": "Search by series name...",
        "issueTitlePlaceholder": "Search by title...",
        "writerPlaceholder": "Search by writer...",
        "artistPlaceholder": "Search by artist...",
        "languageFilter": "All languages",
        "publisherFilter": "All publishers",
        "yearFilter": "All years",
        "searchButton": "Search",
        "addButton": "Add new comic",
        "importButton": "Import from Google Sheets",
        "exportButton": "Export to CSV"
    },
    "comic": {
        "title": {
            "add": "Add new comic",
            "edit": "Edit comic"
        },
        "fields": {
            "series": "Series",
            "issueTitle": "Title",
            "issueNumber": "Number",
            "writers": "Writers",
            "artists": "Artists",
            "language": "Language",
            "publisher": "Publisher",
            "year": "Year"
        },
        "form": {
            "writersHint": "Separate multiple writers with commas",
            "artistsHint": "Separate multiple artists with commas"
        },
        "actions": {
            "edit": "Edit",
            "delete": "Delete",
            "save": "Save comic",
            "cancel": "Cancel",
            "backToList": "← Back to comics list"
        }
    },
    "messages": {
        "deleteConfirm": "Are you sure you want to delete this comic?",
        "deleteSuccess": "Comic deleted successfully",
        "saveSuccess": "Comic saved successfully",
        "error": "An error occurred",
        "loadingError": "Error loading comics. Please try again.",
        "import": {
            "promptUrl": "Paste the shared Google Sheets URL:",
            "errorPrefix": "Error importing comics:",
            "noValidRows": "No valid comic rows found. Check sheet columns and ensure at least series or issue title is present.",
            "notShared": "The spreadsheet is not publicly shared. Please share it with \"Anyone with the link can view\".",
            "invalidGoogleUrl": "URL must be a docs.google.com Google Sheets link"
        }
    },
    "navigation": {
        "backToMain": "← Back to main page",
        "backToTop": "Back to top"
    }
}
``` 
