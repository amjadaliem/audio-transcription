import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/youtube-captions', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = url.match(/(?:v=|\/)([^&?/]+)/)?.[1];
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Fetch the video page
    const response = await fetch(`https://youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Find caption track URL
    const captionMatch = html.match(/"captionTracks":\[\{"baseUrl":"([^"]+)"/);
    if (!captionMatch) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }
    
    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
    const captionResponse = await fetch(captionUrl);
    const captionText = await captionResponse.text();
    
    // Parse XML captions using jsdom
    const dom = new JSDOM(captionText, { contentType: 'text/xml' });
    const captions = Array.from(dom.window.document.getElementsByTagName('text'))
      .map(caption => ({
        start: parseFloat(caption.getAttribute('start')),
        dur: parseFloat(caption.getAttribute('dur')),
        text: caption.textContent.trim()
      }))
      .sort((a, b) => a.start - b.start)
      .map(caption => caption.text)
      .join('\n');

    res.json({ captions });
  } catch (error) {
    console.error('YouTube caption error:', error);
    res.status(500).json({ error: 'Failed to fetch captions: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 