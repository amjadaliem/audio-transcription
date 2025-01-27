import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize YouTube API client
const youtube = google.youtube('v3');
const API_KEY = 'AIzaSyCO5VieNatnPYYqK-0XJ7eUOYsgxmDCTtg'; // Using the same API key as frontend

app.post('/api/youtube-captions', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Extract video ID from URL
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video details first
    const videoResponse = await youtube.videos.list({
      key: API_KEY,
      part: ['snippet'],
      id: [videoId]
    });

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get caption tracks
    const captionResponse = await youtube.captions.list({
      key: API_KEY,
      part: ['snippet'],
      videoId: videoId
    });

    if (!captionResponse.data.items || captionResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }

    // Get the first available caption track
    const captionTrack = captionResponse.data.items[0];

    // Get the transcript using the YouTube Data API
    const transcriptResponse = await youtube.captions.download({
      key: API_KEY,
      id: captionTrack.id,
      tfmt: 'srt' // Request captions in SRT format
    });

    // Parse the SRT format to extract just the text
    const transcriptText = transcriptResponse.data
      .split('\n\n')
      .map(block => {
        const lines = block.split('\n');
        return lines.length > 2 ? lines.slice(2).join(' ') : '';
      })
      .filter(text => text)
      .join('\n');

    res.json({ captions: transcriptText });
  } catch (error) {
    console.error('YouTube caption error:', error);
    res.status(500).json({ error: 'Failed to fetch captions: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 