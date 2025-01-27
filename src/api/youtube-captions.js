import { getTranscript } from 'youtube-transcript-api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Extract video ID from URL
    const videoId = url.match(/(?:v=|\/)([^&?/]+)/)?.[1];
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get transcripts
    const transcripts = await getTranscript(videoId);
    
    if (!transcripts || transcripts.length === 0) {
      return res.status(404).json({ error: 'No captions found for this video' });
    }

    // Combine all text with proper spacing
    const text = transcripts
      .map(t => t.text.trim())
      .filter(t => t) // Remove empty strings
      .join(' ');

    if (!text) {
      return res.status(404).json({ error: 'No valid caption text found' });
    }

    // Ensure we're sending a valid JSON response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ text: text });

  } catch (error) {
    console.error('Caption extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract captions. Make sure the video exists and has captions available.' 
    });
  }
} 