const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser');
const { importFromGoogleSheets } = require('./googleSheets');

const app = express();
const port = 3000;
let writeQueue = Promise.resolve();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('.'));
app.use('/translations', express.static('translations'));

const AUTH_USERNAME = process.env.AUTH_USER || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'password';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'cbd-secret-token';

function getAuthToken(req) {
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authHeader.slice(7).trim();
	}
	return req.cookies?.authToken || null;
}

function requireAuth(req, res, next) {
	const token = getAuthToken(req);
	if (token !== AUTH_TOKEN) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	next();
}

app.post('/api/login', (req, res) => {
	const { username, password } = req.body;
	if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
		res.cookie('authToken', AUTH_TOKEN, {
			httpOnly: true,
			sameSite: 'Lax'
		});
		return res.json({ success: true, token: AUTH_TOKEN });
	}
	res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
	res.clearCookie('authToken');
	res.json({ success: true });
});

// Data file path
const dataFilePath = path.join(__dirname, 'comics.json');

function toStringOrEmpty(value) {
	return value == null ? '' : String(value).trim();
}

function toNumberOrNull(value) {
	if (value == null || value === '') {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function toArray(value) {
	if (Array.isArray(value)) {
		return value.map(v => String(v).trim()).filter(Boolean);
	}
	if (typeof value === 'string') {
		return value.split(',').map(v => v.trim()).filter(Boolean);
	}
	return [];
}

function normalizeComic(input, existingId = null) {
	const normalized = {
		id: existingId,
		seriesTitle: toStringOrEmpty(input.seriesTitle ?? input.series),
		issueTitle: toStringOrEmpty(input.issueTitle ?? input.title),
		issueNumber: toNumberOrNull(input.issueNumber ?? input.number),
		writers: toArray(input.writers ?? input.writer),
		artists: toArray(input.artists),
		language: toStringOrEmpty(input.language),
		publisher: toStringOrEmpty(input.publisher),
		publicationYear: toNumberOrNull(input.publicationYear ?? input.year)
	};

	return normalized;
}

function validateComic(comic) {
	const errors = [];
	if (!comic.seriesTitle) {
		errors.push({ field: 'seriesTitle', message: 'seriesTitle is required' });
	}
	if (!comic.issueTitle) {
		errors.push({ field: 'issueTitle', message: 'issueTitle is required' });
	}
	if (comic.issueNumber != null && !Number.isInteger(comic.issueNumber)) {
		errors.push({ field: 'issueNumber', message: 'issueNumber must be an integer or null' });
	}
	if (comic.publicationYear != null && !Number.isInteger(comic.publicationYear)) {
		errors.push({ field: 'publicationYear', message: 'publicationYear must be an integer or null' });
	}
	if (!Array.isArray(comic.writers)) {
		errors.push({ field: 'writers', message: 'writers must be an array' });
	}
	if (!Array.isArray(comic.artists)) {
		errors.push({ field: 'artists', message: 'artists must be an array' });
	}
	return errors;
}

async function readComics() {
	const data = await fs.readFile(dataFilePath, 'utf8');
	return JSON.parse(data);
}

function withWriteLock(fn) {
	const operation = writeQueue.then(fn, fn);
	writeQueue = operation.catch(() => {});
	return operation;
}

// Initialize data file if it doesn't exist
async function initializeDataFile() {
	try {
		await fs.access(dataFilePath);
	} catch {
		const initialData = [];
		await fs.writeFile(dataFilePath, JSON.stringify(initialData, null, 2));
	}
}

// Initialize data file
initializeDataFile();

// Get all comics
app.get('/api/comics', async (req, res) => {
	try {
		const comics = await readComics();
		res.json(comics);
	} catch (error) {
		console.error('Error reading comics:', error);
		res.status(500).json({ error: 'Error reading comics data' });
	}
});

// Get a single comic by ID
app.get('/api/comics/:id', async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const comics = await readComics();
		const comic = comics.find(c => c.id === id);
		if (!comic) {
			return res.status(404).json({ error: 'Comic not found' });
		}
		res.json(comic);
	} catch (error) {
		res.status(500).json({ error: 'Error reading comics data' });
	}
});

// Add a new comic
app.post('/api/comics', requireAuth, async (req, res) => {
	try {
		const result = await withWriteLock(async () => {
			const comics = await readComics();
			const nextId = Math.max(...comics.map(c => c.id), 0) + 1;
			const newComic = normalizeComic(req.body, nextId);
			const errors = validateComic(newComic);
			if (errors.length > 0) {
				return { validationErrors: errors };
			}
			comics.push(newComic);
			await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
			return { comic: newComic };
		});

		if (result.validationErrors) {
			return res.status(400).json({ error: 'Validation failed', details: result.validationErrors });
		}

		res.status(201).json(result.comic);
	} catch (error) {
		console.error('Error adding comic:', error);
		res.status(500).json({ error: 'Error adding comic' });
	}
});

// Update a comic
app.put('/api/comics/:id', requireAuth, async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const result = await withWriteLock(async () => {
			const comics = await readComics();
			const index = comics.findIndex(c => c.id === id);
			
			if (index === -1) {
				return { notFound: true };
			}

			const mergedPayload = {
				...comics[index],
				...req.body
			};
			const updatedComic = normalizeComic(mergedPayload, id);
			const errors = validateComic(updatedComic);
			if (errors.length > 0) {
				return { validationErrors: errors };
			}

			comics[index] = updatedComic;
			await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
			return { comic: updatedComic };
		});

		if (result.notFound) {
			return res.status(404).json({ error: 'Comic not found' });
		}
		if (result.validationErrors) {
			return res.status(400).json({ error: 'Validation failed', details: result.validationErrors });
		}

		res.json(result.comic);
	} catch (error) {
		console.error('Error updating comic:', error);
		res.status(500).json({ error: 'Error updating comic' });
	}
});

// Delete a comic
app.delete('/api/comics/:id', requireAuth, async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const result = await withWriteLock(async () => {
			const comics = await readComics();
			const index = comics.findIndex(c => c.id === id);
			
			if (index === -1) {
				return { notFound: true };
			}

			comics.splice(index, 1);
			await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
			return { success: true };
		});

		if (result.notFound) {
			return res.status(404).json({ error: 'Comic not found' });
		}

		res.json({ message: 'Comic deleted successfully' });
	} catch (error) {
		console.error('Error deleting comic:', error);
		res.status(500).json({ error: 'Error deleting comic' });
	}
});

// Import comics from Google Sheets
app.post('/api/import', requireAuth, async (req, res) => {
	try {
		const sheetUrl = req.body?.url;
		if (!sheetUrl || typeof sheetUrl !== 'string') {
			return res.status(400).json({ error: 'Please provide a Google Sheets URL in the request body as { "url": "..." }' });
		}

		const comics = await importFromGoogleSheets(sheetUrl);
		const normalizedComics = comics.map(comic => normalizeComic(comic));

		// Import only rows that contain at least one meaningful title field.
		// This prevents one malformed/blank row from failing the whole import.
		const validComics = normalizedComics.filter(comic => comic.seriesTitle || comic.issueTitle);
		const skippedRows = normalizedComics.length - validComics.length;

		if (validComics.length === 0) {
			return res.status(400).json({
				error: 'No valid comic rows found. Check sheet columns and ensure at least series or issue title is present.'
			});
		}

		const comicsWithIds = validComics.map((comic, index) => ({
			...comic,
			id: index + 1
		}));

		await withWriteLock(async () => {
			await fs.writeFile(dataFilePath, JSON.stringify(comicsWithIds, null, 2));
		});

		const message = skippedRows > 0
			? `Successfully imported ${comicsWithIds.length} comics (${skippedRows} rows skipped).`
			: `Successfully imported ${comicsWithIds.length} comics`;

		res.json({ message });
	} catch (error) {
		console.error('Error importing comics:', error);
		res.status(400).json({ error: error.message || 'Error importing comics' });
	}
});

// Serve translations
app.get('/translations', async (req, res) => {
	try {
		const translationsDir = path.join(__dirname, 'translations');
		const files = await fs.readdir(translationsDir);
		const translations = {};
		const availableLanguages = [];
		
		// Language name mapping
		const languageNames = {
			'en': 'English',
			'pl': 'Polski',
			'sv': 'Svenska',
			'de': 'Deutsch'
		};
		
		for (const file of files) {
			if (file.endsWith('.json')) {
				const langCode = file.replace('.json', '');
				const filePath = path.join(translationsDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				translations[langCode] = JSON.parse(content);
				availableLanguages.push({
					code: langCode,
					name: languageNames[langCode] || langCode
				});
			}
		}
		
		res.json({
			translations: translations,
			availableLanguages: availableLanguages
		});
	} catch (error) {
		console.error('Error reading translations directory:', error);
		res.status(500).json({ error: 'Failed to read translations directory' });
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
}); 