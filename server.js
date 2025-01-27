import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transcription from './models/Transcription.js';

dotenv.config();

const app = express();
const port = 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Increase payload size limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://audio-transcription-amjadaliem.vercel.app',
    'https://audio-transcription-git-main-amjadaliem.vercel.app',
    'https://audio-transcription-*.vercel.app'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Update MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/transcriptions';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.post('/api/youtube/transcribe', async (req, res) => {
  try {
    const { videoId, url, title } = req.body;
    if (!videoId || !url) {
      console.error('Missing required fields:', { videoId, url });
      return res.status(400).json({ error: 'Video ID and URL are required' });
    }

    console.log('Processing YouTube video:', { videoId, url, title });

    // Check if transcription already exists
    let transcription = await Transcription.findOne({ 
      documentType: 'transcription',
      source: 'youtube',
      sourceUrl: url 
    });

    if (transcription) {
      console.log('Found existing transcription:', transcription._id);
      return res.json({
        message: 'Transcription found in database',
        transcription
      });
    }

    console.log('Fetching transcript for video:', videoId);
    const startTime = Date.now();

    // Get transcript using youtube-transcript library
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      return res.status(404).json({ 
        error: 'Failed to fetch video captions. Make sure the video exists and has captions available.' 
      });
    }
    
    if (!transcript || transcript.length === 0) {
      console.error('No transcript found for video:', videoId);
      return res.status(404).json({ error: 'No captions found for this video' });
    }

    console.log('Formatting transcript with timestamps...');
    // Format transcript with timestamps
    const rawTranscript = transcript
      .map(item => {
        const timestamp = new Date(item.offset).toISOString().substr(14, 5);
        return `[${timestamp}] ${item.text}`;
      })
      .join('\n');

    // Send to Gemini for formatting
    console.log('Sending to Gemini for formatting...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a transcription formatter. Format this transcription into proper paragraphs while maintaining readability and context. Keep all timestamps exactly as they are.

Rules:
1. Keep all timestamps in their exact format [MM:SS]
2. Group related sentences into paragraphs
3. Add line breaks between different topics or speakers
4. Maintain the chronological order
5. Do not add any additional text or commentary
6. Do not modify the actual content or timestamps

Transcription to format:

${rawTranscript}`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini formatting error:', await response.text());
      throw new Error('Failed to format transcription with Gemini');
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response:', data);
      throw new Error('Invalid response format from Gemini');
    }
    const formattedTranscript = data.candidates[0].content.parts[0].text;

    const duration = transcript.reduce((max, item) => 
      Math.max(max, item.offset + item.duration), 0);

    // Create new transcription document
    transcription = new Transcription({
      documentType: 'transcription',
      title: title || 'YouTube Video',
      source: 'youtube',
      sourceUrl: url,
      transcription: {
        text: formattedTranscript,
        languages: ['en'],
        duration: Math.ceil(duration)
      },
      summary: '',
      keyTakeaways: [],
      resources: [],
      metadata: {
        processingDuration: Date.now() - startTime,
        mimeType: 'text/plain'
      }
    });

    // Save to database
    try {
      await transcription.save();
      console.log('Saved new transcription:', transcription._id);
    } catch (error) {
      console.error('Failed to save transcription:', error);
      return res.status(500).json({ error: 'Failed to save transcription to database' });
    }

    res.json({
      message: 'Video processed and saved successfully',
      transcription
    });

  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: error.message || 'Failed to process video' });
  }
});

app.get('/api/transcriptions', async (req, res) => {
  try {
    const transcriptions = await Transcription.find({ documentType: 'transcription' })
      .sort({ createdAt: -1 })
      .select('-transcription.text'); // Exclude the full text for better performance

    console.log(`Retrieved ${transcriptions.length} transcriptions`);
    res.json(transcriptions);
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transcriptions' });
  }
});

app.get('/api/transcriptions/:id', async (req, res) => {
  try {
    const transcription = await Transcription.findOne({
      _id: req.params.id,
      documentType: 'transcription'
    });
    
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    console.log('Retrieved transcription:', transcription._id);
    res.json(transcription);
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transcription' });
  }
});

app.post('/api/transcriptions', async (req, res) => {
  try {
    const transcriptionData = {
      ...req.body,
      documentType: 'transcription'
    };

    console.log('Creating new transcription with data:', {
      title: transcriptionData.title,
      source: transcriptionData.source,
      hasTranscription: !!transcriptionData.transcription?.text,
      hasSummary: !!transcriptionData.summary,
      hasKeyTakeaways: Array.isArray(transcriptionData.keyTakeaways),
      hasResources: Array.isArray(transcriptionData.resources)
    });

    // Create new transcription document
    const transcription = new Transcription(transcriptionData);

    // Save to database
    await transcription.save();
    console.log('Saved new transcription:', transcription._id);

    res.status(201).json({
      message: 'Transcription saved successfully',
      transcription
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to save transcription' });
  }
});

// Update port configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
}); 