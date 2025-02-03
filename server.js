const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use('/posts/deleted', express.static(path.join(__dirname, 'posts', 'deleted')));

// API Endpoints
app.get('/api/posts', async (req, res) => {
    try {
        const postsDir = path.join(__dirname, 'posts');
        const files = await fs.readdir(postsDir);
        const posts = [];

        for (const filename of files) {
            if (filename === '.DS_Store' || filename === '_template.html' || filename === 'deleted' || filename === 'trash') continue;

            const filepath = path.join(postsDir, filename);
            const stats = await fs.stat(filepath);
            
            if (stats.isFile()) {
                const content = await fs.readFile(filepath, 'utf-8');
                
                // Extract metadata from HTML
                const $ = cheerio.load(content);
                const title = $('title').text() || 'Untitled';
                const date = $('.date').text() || new Date(stats.birthtime).toLocaleDateString();
                const tags = $('.tag').map((i, el) => $(el).text().trim()).get();

                posts.push({
                    title,
                    date,
                    tags,
                    filename,
                    size: stats.size,
                    lastModified: stats.mtime
                });
            }
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        res.json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Error getting posts' });
    }
});

app.delete('/api/post/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        if (filename === '_template.html') {
            return res.status(400).json({ error: 'Cannot delete template file' });
        }

        const postsDir = path.join(__dirname, 'posts');
        const deletedDir = path.join(postsDir, 'deleted');
        await fs.mkdir(deletedDir, { recursive: true });

        const sourceFile = path.join(postsDir, filename);
        const targetFile = path.join(deletedDir, filename);

        await fs.rename(sourceFile, targetFile);

        res.json({ message: 'Post moved to deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Error deleting post' });
    }
});

app.post('/api/post/:filename/restore', async (req, res) => {
    try {
        const { filename } = req.params;
        const postsDir = path.join(__dirname, 'posts');
        const deletedDir = path.join(postsDir, 'deleted');

        const sourceFile = path.join(deletedDir, filename);
        const targetFile = path.join(postsDir, filename);

        await fs.rename(sourceFile, targetFile);

        res.json({ message: 'Post restored' });
    } catch (error) {
        console.error('Error restoring post:', error);
        res.status(500).json({ error: 'Error restoring post' });
    }
});

// Serve posts directly
app.get('/posts/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        if (filename === '_template.html') {
            return res.status(404).send('Not found');
        }

        const postsDir = path.join(__dirname, 'posts');
        const htmlPath = path.join(postsDir, filename);
        
        const content = await fs.readFile(htmlPath, 'utf-8');
        res.send(content);
    } catch (error) {
        console.error('Error serving post:', error);
        res.status(500).send('Error serving post');
    }
});

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
