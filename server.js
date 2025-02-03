const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');
const { marked } = require('marked');

// Configure marked
marked.setOptions({
    gfm: true,
    breaks: true,
    highlight: function(code, lang) {
        return `<pre><code class="hljs language-${lang}">${code}</code></pre>`;
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use('/posts/deleted', express.static(path.join(__dirname, 'posts', 'deleted')));

// API Endpoints
app.get('/api/posts', async (req, res) => {
    try {
        const showDeleted = req.query.showDeleted === 'true';
        const postsDir = path.join(__dirname, 'posts');
        const deletedDir = path.join(__dirname, 'posts', 'deleted');
        console.log('Checking directories:', { postsDir, deletedDir, showDeleted });
        
        const files = await fs.readdir(postsDir);
        const posts = [];

        // Get regular posts
        for (const filename of files) {
            if (filename === 'deleted') continue; // Skip the deleted directory
            if (filename.endsWith('.html') && !filename.startsWith('_')) {
                const filepath = path.join(postsDir, filename);
                const content = await fs.readFile(filepath, 'utf-8');
                const $ = cheerio.load(content);

                // Extract title, date, and tags
                const title = $('h1').first().text().trim() || 'Untitled';
                const date = $('.text-gray-600').text().replace('Published on ', '').trim();
                const tags = [];
                $('.bg-gray-100').each((i, elem) => {
                    tags.push($(elem).text().trim());
                });

                posts.push({
                    filename,
                    title,
                    date,
                    tags,
                    url: `/posts/${filename}`,
                    isDeleted: false
                });
            }
        }

        // Get deleted posts if requested
        if (showDeleted) {
            try {
                console.log('Attempting to read deleted directory');
                const deletedFiles = await fs.readdir(deletedDir);
                console.log('Found deleted files:', deletedFiles);
                
                for (const filename of deletedFiles) {
                    if (filename.endsWith('.html') && !filename.startsWith('_')) {
                        const filepath = path.join(deletedDir, filename);
                        const content = await fs.readFile(filepath, 'utf-8');
                        const $ = cheerio.load(content);

                        // Extract title, date, and tags
                        const title = $('h1').first().text().trim() || 'Untitled';
                        const date = $('.text-gray-600').text().replace('Published on ', '').trim();
                        const tags = [];
                        $('.bg-gray-100').each((i, elem) => {
                            tags.push($(elem).text().trim());
                        });

                        posts.push({
                            filename,
                            title,
                            date,
                            tags,
                            url: `/posts/deleted/${filename}`,
                            isDeleted: true
                        });
                    }
                }
            } catch (error) {
                console.error('Error reading deleted posts:', error);
                // Create the deleted directory if it doesn't exist
                if (error.code === 'ENOENT') {
                    console.log('Creating deleted directory');
                    await fs.mkdir(deletedDir, { recursive: true });
                }
            }
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });

        console.log('Sending posts:', posts.length);
        res.json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Error getting posts' });
    }
});

app.post('/api/post', async (req, res) => {
    try {
        const { title, content, filename, tags } = req.body;

        if (!title || !content || !filename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Don't overwrite template
        if (filename === '_template.html') {
            return res.status(400).json({ error: 'Cannot overwrite template file' });
        }

        // Store the original markdown content in a .md file
        const postsDir = path.join(__dirname, 'posts');
        const markdownPath = path.join(postsDir, filename.replace('.html', '.md'));
        await fs.writeFile(markdownPath, content);

        const date = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date());

        const tagElements = tags ? tags.map(tag => 
            `<span class="bg-gray-100 rounded-md px-2 py-1 mr-2">${tag}</span>`
        ).join('') : '';

        // Configure marked with options
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: true,
            mangle: false
        });

        const finalContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    typography: {
                        DEFAULT: {
                            css: {
                                maxWidth: 'none',
                            },
                        },
                    },
                },
                plugins: [
                    function({ addComponents }) {
                        addComponents({
                            '.prose': {
                                'h1': { fontSize: '2em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1.5em' },
                                'h2': { fontSize: '1.5em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1.5em' },
                                'h3': { fontSize: '1.25em', fontWeight: 'bold', marginBottom: '0.5em', marginTop: '1.5em' },
                                'p': { marginBottom: '1em', lineHeight: '1.6' },
                                'ul': { listStyle: 'disc', paddingLeft: '2em', marginBottom: '1em' },
                                'ol': { listStyle: 'decimal', paddingLeft: '2em', marginBottom: '1em' },
                                'li': { marginBottom: '0.25em' },
                                'a': { color: '#3b82f6', textDecoration: 'underline' },
                                'blockquote': { borderLeft: '4px solid #e5e7eb', paddingLeft: '1em', marginBottom: '1em', fontStyle: 'italic', color: '#4b5563' },
                                'code': { backgroundColor: '#f3f4f6', padding: '0.2em 0.4em', borderRadius: '0.25em', fontSize: '0.875em' },
                                'pre': { backgroundColor: '#f3f4f6', padding: '1em', borderRadius: '0.5em', marginBottom: '1em', overflow: 'auto' },
                                'pre code': { backgroundColor: 'transparent', padding: 0, fontSize: '0.875em' },
                                'strong': { fontWeight: 'bold' },
                                'em': { fontStyle: 'italic' },
                                'hr': { marginTop: '2em', marginBottom: '2em', borderColor: '#e5e7eb' },
                                'table': { width: '100%', marginBottom: '1em', borderCollapse: 'collapse' },
                                'th,td': { padding: '0.5em', borderBottom: '1px solid #e5e7eb' },
                                'th': { fontWeight: 'bold', textAlign: 'left' },
                                'img': { maxWidth: '100%', height: 'auto', marginBottom: '1em' }
                            }
                        })
                    }
                ]
            }
        }
    </script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</head>
<body class="bg-gray-50">
    <nav class="bg-white border-b">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex">
                    <div class="flex-shrink-0 flex items-center">
                        <a href="/" class="text-xl font-bold">Home</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article class="max-w-3xl mx-auto">
            <header class="mb-8">
                <h1 class="text-3xl font-bold mb-2">${title}</h1>
                <div class="flex items-center space-x-4 text-sm mb-4">
                    <span class="text-gray-500">tagged with</span>
                    ${tagElements}
                </div>
                <p class="text-gray-600">Published on ${date}</p>
            </header>

            <div class="prose max-w-none">
                ${marked(content)}
            </div>
        </article>
    </main>

    <footer class="bg-white border-t mt-12">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <p class="text-center text-gray-500">
                <a href="/" class="hover:text-gray-700">Back to Home</a>
            </p>
        </div>
    </footer>
</body>
</html>`;

        const htmlPath = path.join(postsDir, filename);
        await fs.writeFile(htmlPath, finalContent);

        res.json({ message: 'Post saved successfully' });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ error: 'Error saving post' });
    }
});

// Add endpoint to get markdown content for editing
app.get('/api/post/:filename/content', async (req, res) => {
    try {
        const { filename } = req.params;
        const postsDir = path.join(__dirname, 'posts');
        const markdownPath = path.join(postsDir, filename.replace('.html', '.md'));
        
        try {
            // First try to get the .md file
            const content = await fs.readFile(markdownPath, 'utf-8');
            res.json({ content });
        } catch (error) {
            // If .md file doesn't exist, get content from HTML and convert HTML back to markdown-like format
            const htmlPath = path.join(postsDir, filename);
            const htmlContent = await fs.readFile(htmlPath, 'utf-8');
            const $ = cheerio.load(htmlContent);
            
            // Get the content from the prose div
            const proseDiv = $('.prose');
            if (!proseDiv.length) {
                return res.json({ content: '' });
            }

            // Convert the HTML content back to a markdown-like format
            let content = '';
            proseDiv.children().each((i, el) => {
                const $el = $(el);
                const tagName = el.tagName.toLowerCase();
                
                switch (tagName) {
                    case 'h1':
                        content += `# ${$el.text()}\n\n`;
                        break;
                    case 'h2':
                        content += `## ${$el.text()}\n\n`;
                        break;
                    case 'h3':
                        content += `### ${$el.text()}\n\n`;
                        break;
                    case 'p':
                        let text = $el.html()
                            .replace(/<br>/g, '\n')
                            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                            .replace(/<em>(.*?)<\/em>/g, '*$1*')
                            .replace(/<code>(.*?)<\/code>/g, '`$1`')
                            .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');
                        content += `${text}\n\n`;
                        break;
                    case 'pre':
                        const code = $el.find('code');
                        const language = code.attr('class')?.replace('language-', '') || '';
                        content += `\`\`\`${language}\n${code.text()}\n\`\`\`\n\n`;
                        break;
                    case 'ul':
                        $el.find('li').each((i, li) => {
                            content += `- ${$(li).text()}\n`;
                        });
                        content += '\n';
                        break;
                    case 'ol':
                        $el.find('li').each((i, li) => {
                            content += `${i + 1}. ${$(li).text()}\n`;
                        });
                        content += '\n';
                        break;
                    case 'blockquote':
                        content += `> ${$el.text()}\n\n`;
                        break;
                }
            });

            // Create a .md file for future use
            await fs.writeFile(markdownPath, content);
            
            res.json({ content });
        }
    } catch (error) {
        console.error('Error getting post content:', error);
        res.status(500).json({ error: 'Error getting post content' });
    }
});

// Update delete endpoint to handle .md files
app.delete('/api/post/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Don't delete template
        if (filename === '_template.html') {
            return res.status(400).json({ error: 'Cannot delete template file' });
        }

        const postsDir = path.join(__dirname, 'posts');
        const deletedDir = path.join(postsDir, 'deleted');
        await fs.mkdir(deletedDir, { recursive: true });

        // Move both HTML and MD files
        const htmlSourceFile = path.join(postsDir, filename);
        const htmlTargetFile = path.join(deletedDir, filename);
        const mdSourceFile = path.join(postsDir, filename.replace('.html', '.md'));
        const mdTargetFile = path.join(deletedDir, filename.replace('.html', '.md'));

        await fs.rename(htmlSourceFile, htmlTargetFile);
        try {
            await fs.rename(mdSourceFile, mdTargetFile);
        } catch (error) {
            console.log('No markdown file found to move');
        }

        res.json({ message: 'Post moved to deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Error deleting post' });
    }
});

// Update restore endpoint to handle .md files
app.post('/api/post/:filename/restore', async (req, res) => {
    try {
        const { filename } = req.params;
        const postsDir = path.join(__dirname, 'posts');
        const deletedDir = path.join(postsDir, 'deleted');
        
        // Move both HTML and MD files back
        const htmlSourceFile = path.join(deletedDir, filename);
        const htmlTargetFile = path.join(postsDir, filename);
        const mdSourceFile = path.join(deletedDir, filename.replace('.html', '.md'));
        const mdTargetFile = path.join(postsDir, filename.replace('.html', '.md'));

        await fs.rename(htmlSourceFile, htmlTargetFile);
        try {
            await fs.rename(mdSourceFile, mdTargetFile);
        } catch (error) {
            console.log('No markdown file found to restore');
        }

        res.json({ message: 'Post restored' });
    } catch (error) {
        console.error('Error restoring post:', error);
        res.status(500).json({ error: 'Error restoring post' });
    }
});

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
