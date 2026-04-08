const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { importFromGoogleSheets } = require('./googleSheets');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use('/translations', express.static('translations'));

// Data file path
const dataFilePath = path.join(__dirname, 'comics.json');

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
		const data = await fs.readFile(dataFilePath, 'utf8');
		res.json(JSON.parse(data));
	} catch (error) {
		console.error('Error reading comics:', error);
		res.status(500).json({ error: 'Error reading comics data' });
	}
});

// Get a single comic by ID
app.get('/api/comics/:id', async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const data = await fs.readFile(dataFilePath, 'utf8');
		const comics = JSON.parse(data);
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
app.post('/api/comics', async (req, res) => {
	try {
		const data = await fs.readFile(dataFilePath, 'utf8');
		const comics = JSON.parse(data);
		const newComic = {
			...req.body,
			id: Math.max(...comics.map(c => c.id), 0) + 1
		};
		comics.push(newComic);
		await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
		res.status(201).json(newComic);
	} catch (error) {
		console.error('Error adding comic:', error);
		res.status(500).json({ error: 'Error adding comic' });
	}
});

// Update a comic
app.put('/api/comics/:id', async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const data = await fs.readFile(dataFilePath, 'utf8');
		const comics = JSON.parse(data);
		const index = comics.findIndex(c => c.id === id);
		
		if (index === -1) {
			return res.status(404).json({ error: 'Comic not found' });
		}

		const updatedComic = {
			...comics[index],
			...req.body,
			id: id // Ensure ID remains unchanged
		};

		// Ensure writers and artists are always arrays
		if (typeof updatedComic.writers === 'string') {
			updatedComic.writers = [updatedComic.writers];
		}
		if (typeof updatedComic.artists === 'string') {
			updatedComic.artists = [updatedComic.artists];
		}

		comics[index] = updatedComic;
		await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
		res.json(updatedComic);
	} catch (error) {
		console.error('Error updating comic:', error);
		res.status(500).json({ error: 'Error updating comic' });
	}
});

// Delete a comic
app.delete('/api/comics/:id', async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const data = await fs.readFile(dataFilePath, 'utf8');
		const comics = JSON.parse(data);
		const index = comics.findIndex(c => c.id === id);
		
		if (index === -1) {
			return res.status(404).json({ error: 'Comic not found' });
		}

		comics.splice(index, 1);
		await fs.writeFile(dataFilePath, JSON.stringify(comics, null, 2));
		res.json({ message: 'Comic deleted successfully' });
	} catch (error) {
		console.error('Error deleting comic:', error);
		res.status(500).json({ error: 'Error deleting comic' });
	}
});

// Import comics from Google Sheets
app.post('/api/import', async (req, res) => {
	try {
		// Clear existing data
		await fs.writeFile(dataFilePath, JSON.stringify([], null, 2));

		// Import new data from Google Sheets
		const comics = await importFromGoogleSheets();
		
		// Add IDs to imported comics
		const comicsWithIds = comics.map((comic, index) => ({
			...comic,
			id: index + 1
		}));

		// Write to file
		await fs.writeFile(dataFilePath, JSON.stringify(comicsWithIds, null, 2));
		
		res.json({ message: `Successfully imported ${comicsWithIds.length} comics` });
	} catch (error) {
		console.error('Error importing comics:', error);
		res.status(500).json({ error: 'Error importing comics' });
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