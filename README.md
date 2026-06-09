# Comic Collection Manager

A comic collection manager that stores data in a flat file on the server. The browser UI is still static HTML, CSS, and JavaScript, but the app now persists comics to `comics.json` in the project root.

## Changelog

See `CHANGELOG.md` for release history and notable updates.

## Features

- View, search, add, edit, and delete comics in the browser
- Sort by any column (series → title → issue number)
- Dynamic search suggestions for series, title, writer, and artist
- Import comics from a shared Google Sheets URL
- Export your collection to CSV
- Supports multiple languages via client-side translation files
- Stores data in `comics.json` on the server
- View-only mode hides add/edit/delete controls for safe browsing

## Usage

### Start the server

Install dependencies and run the server from the project root:

```bash
npm install
npm start
```

Then open:

```
http://localhost:3000/index.html
```

### Deploying to a web server

1. Upload the project files to your web host.
2. Install Node.js on the server.
3. Run `npm install` and `npm start` in the project directory.
4. Open `index.html` in your browser.

## Data Storage

This version stores comic data in the flat file `comics.json` in the application root. The server exposes a simple REST API under `/api/comics` for the frontend.

If you want to reset the collection, edit or replace `comics.json` on the server.

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

> Note: `comics.json` is not used by the browser version. It remains in the repository only as a legacy/sample file.

## Technologies Used

- Static HTML, CSS, and JavaScript
- Browser `localStorage` for persistence
- Client-side Google Sheets CSV import
- Simple translation system using JSON files in `translations/`

## Translations

The application supports multiple languages through translation files. Currently available languages:
- English (en)
- Polish (pl)
- German (de)
- Swedish (sv)
- French (fr)

### Adding New Translations

1. Create a new JSON file in the `translations` directory with the language code (e.g., `fr.json` for French)
2. Copy the structure from `en.json` and translate all values
3. The language will be available in the language selector automatically

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
 
