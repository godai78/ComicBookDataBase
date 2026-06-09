const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const dataFilePath = path.join(__dirname, 'comics.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

let writeLock = Promise.resolve();
function withWriteLock(fn) {
  writeLock = writeLock.then(fn, fn);
  return writeLock;
}

async function readDataFile() {
  try {
    const content = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeDataFile(data) {
  await withWriteLock(() => fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8'));
}

function normalizeComicItem(comic) {
  const issueNumber = comic.issueNumber == null ? null : Number(comic.issueNumber);
  const publicationYear = comic.publicationYear == null ? null : Number(comic.publicationYear);

  return {
    id: comic.id != null ? Number(comic.id) : undefined,
    seriesTitle: String(comic.seriesTitle || '').trim(),
    issueTitle: String(comic.issueTitle || '').trim(),
    issueNumber: Number.isNaN(issueNumber) ? null : issueNumber,
    writers: Array.isArray(comic.writers)
      ? comic.writers.map(writer => String(writer || '').trim()).filter(Boolean)
      : String(comic.writers || '')
          .split(',')
          .map(writer => writer.trim())
          .filter(Boolean),
    artists: Array.isArray(comic.artists)
      ? comic.artists.map(artist => String(artist || '').trim()).filter(Boolean)
      : String(comic.artists || '')
          .split(',')
          .map(artist => artist.trim())
          .filter(Boolean),
    language: String(comic.language || '').trim(),
    publisher: String(comic.publisher || '').trim(),
    publicationYear: Number.isNaN(publicationYear) ? null : publicationYear
  };
}

function getNextId(comics) {
  return comics.reduce((max, comic) => Math.max(max, Number(comic.id) || 0), 0) + 1;
}

app.get('/api/comics', async (req, res) => {
  try {
    const comics = await readDataFile();
    res.json(comics);
  } catch (error) {
    console.error('Failed to read comics:', error);
    res.status(500).json({ error: 'Failed to read comic database' });
  }
});

app.get('/api/comics/:id', async (req, res) => {
  try {
    const comics = await readDataFile();
    const comic = comics.find(item => String(item.id) === String(req.params.id));
    if (!comic) {
      return res.status(404).json({ error: 'Comic not found' });
    }
    res.json(comic);
  } catch (error) {
    console.error('Failed to read comic:', error);
    res.status(500).json({ error: 'Failed to read comic database' });
  }
});

app.post('/api/comics', async (req, res) => {
  try {
    const comics = await readDataFile();
    const newComic = normalizeComicItem(req.body || {});
    newComic.id = getNextId(comics);
    comics.push(newComic);
    await writeDataFile(comics);
    res.status(201).json(newComic);
  } catch (error) {
    console.error('Failed to create comic:', error);
    res.status(500).json({ error: 'Failed to create comic' });
  }
});

app.put('/api/comics/:id', async (req, res) => {
  try {
    const comics = await readDataFile();
    const index = comics.findIndex(item => String(item.id) === String(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Comic not found' });
    }
    const updatedComic = normalizeComicItem({ ...req.body, id: comics[index].id });
    comics[index] = updatedComic;
    await writeDataFile(comics);
    res.json(updatedComic);
  } catch (error) {
    console.error('Failed to update comic:', error);
    res.status(500).json({ error: 'Failed to update comic' });
  }
});

app.delete('/api/comics/:id', async (req, res) => {
  try {
    const comics = await readDataFile();
    const index = comics.findIndex(item => String(item.id) === String(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Comic not found' });
    }
    comics.splice(index, 1);
    await writeDataFile(comics);
    res.json(comics);
  } catch (error) {
    console.error('Failed to delete comic:', error);
    res.status(500).json({ error: 'Failed to delete comic' });
  }
});

app.put('/api/comics/bulk', async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be an array of comics' });
  }

  try {
    const comics = req.body.map(normalizeComicItem);
    await writeDataFile(comics);
    res.json(comics);
  } catch (error) {
    console.error('Failed to save comics:', error);
    res.status(500).json({ error: 'Failed to save comic database' });
  }
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
