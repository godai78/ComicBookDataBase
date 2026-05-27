# Changelog

All notable changes to this project are documented in this file.

## [0.6] - 2026-05-27

### Added
- Server-side comic normalization and validation in `server.js`.
- Serialized write queue in `server.js` to prevent concurrent file write races.
- Robust CSV parsing for Google Sheets import via `csv-parse` in `googleSheets.js`.

### Changed
- `add.html` now submits comics using the canonical schema (`seriesTitle`, `issueTitle`, `issueNumber`, `publicationYear`, `writers`, `artists`).
- `index.html` now safely handles legacy/incomplete records in display, search, and CSV export.
- Language filter in `index.html` now calls `searchComics()` (fixing broken `filterComics()` handler).
- `edit.html` now trims and filters writers/artists before save and sends nullable publication year.
- Google Sheets import now uses a pasted URL instead of a hardcoded sheet ID.
- Import flow now reports clearer, user-facing errors for invalid or non-shared URLs.
- Import is now tolerant of malformed/blank rows and imports valid rows while reporting skipped count.
- Added English translation keys for import prompt and import-specific error messages.

### Fixed
- Prevented schema drift between frontend create flow and backend data model.
- Improved compatibility for legacy payload keys (`series`, `title`, `number`, `year`, `writer`) through server-side normalization.
- Reduced import failures and malformed row handling issues when importing from Google Sheets.
- Fixed hard failure on mixed-quality imports by skipping invalid rows instead of rejecting the entire import.

