# Personal Website

A minimalist personal website with a blog/notes system and article management.

## Features

- Clean, minimalist design with DM Mono font
- Markdown blog/notes system with tag support
- Article management interface
- Server-side rendering and API endpoints
- Search functionality for articles
- Code syntax highlighting

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

3. Visit http://localhost:8080

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `PORT`: Will be set by Render
     - `NODE_VERSION`: 18.x (or your preferred version)

## Directory Structure

- `/posts/`: Contains all blog posts/notes in HTML format
- `/editor/`: Article management interface
  - `index.html`: Article list and management
  - `editor.html`: Markdown editor for creating/editing articles
- `server.js`: Express server with API endpoints
- `package.json`: Node.js dependencies

## API Endpoints

- `GET /api/posts`: Get all posts with metadata
- `POST /api/post`: Create or update a post
- `DELETE /api/post/<filename>`: Delete a post (moves to trash)
