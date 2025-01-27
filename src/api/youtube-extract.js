import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    
    // Get audio format with highest quality
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!audioFormat) {
      return res.status(400).json({ error: 'No audio format found' });
    }

    // Set response headers
    res.setHeader('Content-Type', 'audio/mp3');
    res.setHeader('Content-Disposition', `attachment; filename="youtube-audio.mp3"`);

    // Stream the audio
    ytdl(url, {
      format: audioFormat,
    }).pipe(res);

  } catch (error) {
    console.error('YouTube extraction error:', error);
    res.status(500).json({ error: 'Failed to extract audio from YouTube' });
  }
} 