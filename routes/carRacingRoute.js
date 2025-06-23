import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the Car Racing game page
router.get('/', (req, res) => {
  try {
    const { match_id, player_id } = req.query;
    
    // Render a simple HTML page with the game in an iframe
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2D Car Racing</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #000;
          }
          #game-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          #game-frame {
            border: none;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="game-container">
          <iframe 
            id="game-frame" 
            src="/games/2d%20Car%20Racing%20Updated/2d%20Car%20Racing/index.html${match_id ? `?match_id=${match_id}&player_id=${player_id}` : ''}"
            allowfullscreen
          ></iframe>
        </div>
        <script>
          // Pass URL parameters to the iframe
          const params = new URLSearchParams(window.location.search);
          const iframe = document.getElementById('game-frame');
          
          // Forward all URL parameters to the iframe
          if (params.toString()) {
            const iframeSrc = new URL(iframe.src);
            params.forEach((value, key) => {
              if (!iframeSrc.searchParams.has(key)) {
                iframeSrc.searchParams.append(key, value);
              }
            });
            iframe.src = iframeSrc.toString();
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error serving Car Racing game:', error);
    res.status(500).send('Error loading game');
  }
});

export default router;
