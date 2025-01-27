import express from 'express';
import cors from 'cors';
import youtubeDl from 'youtube-dl-exec';

const app = express();

// Add more detailed CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from frontend
  methods: ['POST'],
  credentials: true
}));

app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

app.post('/api/youtube-captions', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { url } = req.body;
    if (!url) {
      console.log('No URL provided');
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Fetching captions for:', url);
    
    // Use youtube-dl to get captions
    const output = await youtubeDl(url, {
      skipDownload: true,
      writeAutoSub: true,
      subLang: 'en',
      output: '%(id)s.%(ext)s',
      extractAudio: false,
      writeSub: true,
      writeAutoSub: true,
      subFormat: 'srt',
    });

    if (!output) {
      throw new Error('No captions found');
    }

    // Get the captions text
    const text = output.toString();
    console.log('Successfully fetched captions');
    
    res.json({ text });
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ error: 'Failed to fetch captions: ' + error.message });
  }
});

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  }
}); 