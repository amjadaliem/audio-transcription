import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Mic, Loader2, Upload, Circle, AlertCircle, Wand2, Youtube, Settings, Copy, Share2, Save, Languages, Play, Pause, X, Volume2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GeminiAudioApp = () => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CORS_PROXY = 'https://corsproxy.io/';

  // State declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [summary, setSummary] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [resources, setResources] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [retryData, setRetryData] = useState(null);
  const [savingError, setSavingError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [activeResultTab, setActiveResultTab] = useState('transcription');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);

// Add configuration constants
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
    systemInstruction: `Transcribe audio content of the recording you are given accurately while following these rules:
Ensure accurate representation of the original audio while maintaining clarity and readability. add punctuation and proper spacing based on the voice. format using full stop, coma, question mark and paragraph  `,
});

const generationConfig = {
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

  // Add the missing analysis functions
  const getSummary = async (text) => {
    try {
      const chatSession = model.startChat({
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        }
      });

      const result = await chatSession.sendMessage(
        `Please provide a concise summary of the following text in same language as the text. Focus on the main points and key ideas:\n\n${text}`
      );
      return result.response.text();
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  };

  const getKeyTakeaways = async (text) => {
    try {
      const chatSession = model.startChat({
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        }
      });

      const result = await chatSession.sendMessage(
        `Please analyze the following text and extract 3-5 key takeaways. For each takeaway:
        1. Start with a numbered heading in same language as the text (e.g., "1. Main Point")
        2. Follow with a detailed explanation in same language as the text
        3. End with relevant hashtags in english
        4. Minimum 5-10 takeaways
        
        Format each takeaway as:
        1. [Heading]
        [Detailed explanation]
        #hashtag1 #hashtag2

        Here's the text to analyze:
        ${text}`
      );
      
      const takeawaysText = result.response.text();
      console.log('Key Takeaways Response:', takeawaysText); // Debug log
      return takeawaysText;
    } catch (error) {
      console.error('Error generating key takeaways:', error);
      throw new Error('Failed to generate key takeaways');
    }
  };

  const getResources = async (text) => {
    try {
      const chatSession = model.startChat({
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7, // Increased for more creative resource suggestions
        }
      });

      const prompt = `Based on the following transcription, create a comprehensive resource list mentioned in the transcription  

Instructions:
1. Analyze the content deeply for topics, concepts, and themes
2. Keep descriptions and resources in the same language as the transcription

Format each resource category as follows:

Resource Type: [Category Name]
1. [Resource Title]
   Description: [Clear explanation of relevance]
   
  

Required Categories (if relevant to content):
- Books & Literature
- Online Learning Resources
- Tools & Applications
- Websites & Platforms
- Research & Articles
- Expert Sources
- Related Topics & Courses

Example format:
Resource Type: Books & Literature
1. [Book Title]
   Description: Comprehensive guide covering [relevant topic from transcription]
  
  

Transcription to analyze:
${text}

Note: Focus on quality over quantity.`;

      console.log('Sending resource generation prompt...'); // Debug log
      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();
      console.log('Resource generation response:', response); // Debug log
      
      // Validate response format
      if (!response.includes('Resource Type:')) {
        // If no structured resources found, generate topic-based resources
        const fallbackPrompt = `For the following content, please suggest at least 3 learning resources related to the main topics discussed:
        ${text.substring(0, 1000)}... // Send first 1000 chars for topic extraction`;
        
        const fallbackResult = await chatSession.sendMessage(fallbackPrompt);
        return fallbackResult.response.text();
      }

      return response;
    } catch (error) {
      console.error('Error generating resources:', error);
      throw new Error('Failed to generate resources');
    }
  };

// Utility function to ensure YouTube API is loaded
const ensureYouTubeApiLoaded = () => {
  return new Promise((resolve) => {
    if (window.YT) {
      resolve(window.YT);
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      resolve(window.YT);
    };
  });
};

const AudioPlayer = ({ file }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
    const playerRef = useRef(null);

  useEffect(() => {
      if (file && playerRef.current) {
      const loadAudio = async () => {
        try {
      const url = URL.createObjectURL(file);
          
          // Create AudioContext to get accurate duration
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          setDuration(audioBuffer.duration);
          
            if (playerRef.current) {
              playerRef.current.src = url;
              await playerRef.current.load();
            }

          setIsLoading(false);
          audioContext.close();
          
      return () => {
            URL.revokeObjectURL(url);
          };
        } catch (error) {
          console.error('Error loading audio:', error);
          setIsLoading(false);
        }
      };

      loadAudio();
    }
  }, [file]);

  useEffect(() => {
      if (playerRef.current) {
        const audio = playerRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime || 0);
      };

      const handleLoadedMetadata = () => {
        const audioDuration = audio.duration;
        if (isFinite(audioDuration) && !isNaN(audioDuration)) {
          setDuration(audioDuration);
        } else {
          setDuration(0);
        }
        setIsLoading(false);
      };

      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);
      const handleError = () => {
        console.error('Audio loading error');
        setIsLoading(false);
        setDuration(0);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('error', handleError);
      };
    }
    }, [playerRef.current]);

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    // Ensure we have valid duration
    if (!duration || duration <= 0) return;
    
    // Calculate new time with better precision
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    
      if (playerRef.current) {
      try {
          playerRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  // Add click handler for more precise seeking
  const handleProgressClick = (e) => {
    if (isLoading || !duration) return;
    handleSeek(e);
  };

  const formatTime = (time) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!file) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
              if (playerRef.current) {
              if (isPlaying) {
                  playerRef.current.pause();
              } else {
                  playerRef.current.play().catch(e => {
                  console.error('Playback failed:', e);
                  setIsPlaying(false);
                });
              }
            }
          }}
          disabled={isLoading}
          className={`w-10 h-10 flex items-center justify-center ${
            isLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white rounded-full transition-colors`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-1" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500 min-w-[40px]">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 relative h-2 bg-gray-200 rounded cursor-pointer group"
              onClick={handleProgressClick}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={duration ? (currentTime / duration) * 100 : 0}
            >
              <div 
                className="absolute h-full bg-indigo-600 rounded"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              {!isLoading && (
              <div 
                className="absolute h-4 w-4 bg-indigo-600 rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ 
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`, 
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none'
                }}
              />
              )}
            </div>
            <span className="text-sm text-gray-500 min-w-[40px]">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
            </div>
            <span className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
      </div>
      <audio 
          ref={playerRef}
        preload="metadata"
      />
    </div>
  );
};

// Add the saveToMongoDB function
const saveToMongoDB = async (data) => {
  try {
    // Validate data before sending
    if (!data) throw new Error('No data provided for saving');

    // Format resources properly
    let formattedResources = [];
    if (typeof data.resources === 'string') {
      // If resources is a string, try to parse it
      try {
        const resourceTypes = data.resources.split('Resource Type:').filter(Boolean);
        formattedResources = resourceTypes.map(section => {
          const lines = section.trim().split('\n').filter(Boolean);
          const type = lines[0].trim();
          const resources = [];
          let currentResource = {};
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^\d+\./)) {
              if (Object.keys(currentResource).length > 0) {
                resources.push(currentResource);
              }
              currentResource = {
                title: line.replace(/^\d+\./, '').trim(),
                description: '',
                link: '',
                hashtags: []
              };
            } else if (line.startsWith('http') || line.includes('www.')) {
              currentResource.link = line;
            } else if (line.startsWith('#')) {
              currentResource.hashtags = line.split(' ');
            } else if (currentResource.title) {
              currentResource.description = line;
            }
          }
          if (Object.keys(currentResource).length > 0) {
            resources.push(currentResource);
          }
          
          return {
            type,
            resources
          };
        });
      } catch (e) {
        console.error('Error parsing resources:', e);
        formattedResources = [{ type: 'general', resources: [{ title: data.resources }] }];
      }
    } else if (Array.isArray(data.resources)) {
      formattedResources = data.resources;
    }

    // Format key takeaways
    let formattedKeyTakeaways = [];
    if (typeof data.keyTakeaways === 'string') {
      try {
        const takeaways = data.keyTakeaways.split(/\d+\./).filter(Boolean);
        formattedKeyTakeaways = takeaways.map((takeaway, index) => {
          const lines = takeaway.trim().split('\n').filter(Boolean);
          return {
            number: index + 1,
            heading: lines[0] || '',
            content: lines[1] || '',
            hashtags: lines[2] ? lines[2].split(' ') : []
          };
        });
      } catch (e) {
        console.error('Error parsing key takeaways:', e);
        formattedKeyTakeaways = [{ 
          number: 1, 
          heading: 'Key Takeaway', 
          content: data.keyTakeaways,
          hashtags: []
        }];
      }
    }

    // Format the data according to MongoDB schema
    const formattedData = {
      title: data.title || 'Untitled',
      source: data.source || 'unknown',
      sourceUrl: data.sourceUrl || data.source || '',
      transcription: {
        text: data.transcription || '',
        language: 'auto-detect'
      },
      summary: data.summary || '',
      keyTakeaways: formattedKeyTakeaways,
      resources: formattedResources,
      metadata: {
        ...(data.metadata || {}),
        savedAt: new Date().toISOString(),
        duration: data.metadata?.duration || 0,
        fileSize: data.metadata?.fileSize || 0,
        fileType: data.metadata?.fileType || ''
      }
    };

    // Add retry logic for network issues
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
    const response = await fetch('http://localhost:3001/api/transcriptions', {
        method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
          body: JSON.stringify(formattedData)
    });

        if (!response.ok) {
      const errorData = await response.text();
          throw new Error(errorData || `Server responded with status: ${response.status}`);
    }

        const result = await response.json();
        console.log('Successfully saved to database:', result);
        return result;
    } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        // If it's not the last attempt, wait before retrying
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
          throw error;
        }
    }

    throw lastError;
    } catch (error) {
    console.error('Error saving to MongoDB:', error);
    setRetryData(data);
    setShowRetryDialog(true);
    throw new Error(`Failed to save to database: ${error.message}`);
  }
};

// Add retry save function with improved error handling
const retryDatabaseSave = async () => {
  if (!retryData) return;
  
  try {
    setSavingError(null);
    setIsSaving(true);
    
    // Show saving status
    setSaveStatus('Retrying save...');
    
    await saveToMongoDB(retryData);
    setRetryData(null);
    setShowRetryDialog(false);
    setSaveStatus('Saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
    console.error('Retry save failed:', error);
    setSavingError(error.message || 'Failed to save. Please try again.');
    // Keep retry dialog open if failed
    setShowRetryDialog(true);
  } finally {
    setIsSaving(false);
  }
};

// Add function to remove duplicate lines
const removeDuplicateLines = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const uniqueLines = [...new Set(lines)];
  return uniqueLines.join('\n');
};

// Update handleFileRead function to use direct transcription
  const handleFileRead = async (file) => {
    try {
      setLoading(true);
      setError('');
      setSmoothProgress(0);
      setAudioFile(file);
    setSavingError(null);

    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setSmoothProgress(20);

    // Process audio using Gemini API directly
    const chatSession = model.startChat({
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
      history: [
        {
          role: "user",
          parts: [{
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          }],
        },
      ],
    });

    const result = await chatSession.sendMessage(".");
      const transcriptionText = await result.response.text();
      setResponse(transcriptionText);
      setSmoothProgress(50);

    // Process all analyses in parallel
    const [summaryText, takeawaysText, resourcesText] = await Promise.all([
      getSummary(transcriptionText),
      getKeyTakeaways(transcriptionText),
      getResources(transcriptionText)
    ]);

      console.log('Key Takeaways:', takeawaysText); // Debug log
      setSummary(summaryText);
      setSmoothProgress(70);
      setKeyTakeaways(takeawaysText);
      setSmoothProgress(85);
      setResources(resourcesText);
      setSmoothProgress(95);

      // Save to MongoDB
    const saveData = {
      title: file.name === 'recording.webm' ? 'Voice Recording' : file.name,
      source: file.name === 'recording.webm' ? 'recording' : 'upload',
        transcription: transcriptionText,
        summary: summaryText,
        keyTakeaways: takeawaysText,
        resources: resourcesText,
        metadata: {
          duration: audioRef.current ? audioRef.current.duration : 0,
          fileSize: file.size,
          fileType: file.type,
        }
    };

    try {
      await saveToMongoDB(saveData);
      setSmoothProgress(100);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSavingError('Failed to save to database. Your transcription is still available.');
      setRetryData(saveData);
      setShowRetryDialog(true);
    }

    } catch (error) {
      console.error('Error processing file:', error);
      setError(error.message || 'Failed to process file');
    setRetryData({ file });
    setShowRetryDialog(true);
    } finally {
      setLoading(false);
    }
  };

  // Update handleAudioUpload to use handleFileRead
  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await handleFileRead(file);
      } catch (error) {
        console.error('Upload/Processing error:', error);
      setError(error.message || 'Failed to process audio file');
    }
  };

// Remove chunking-related state variables
const [uploadProgress, setUploadProgress] = useState(0);
const [processingProgress, setProcessingProgress] = useState(0);
const [chunksRef, setChunksRef] = useState([]);

// Update startRecording function to remove chunking references
  const startRecording = async () => {
    try {
      const constraints = {
      audio: {
        deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          channelCount: 2,
          sampleRate: 44100,
          sampleSize: 16,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 128000  // Increased to 128kbps to avoid bitrate warning
    });

    let audioChunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: 'audio/webm',
        lastModified: Date.now()
      });
      handleFileRead(audioFile);
      audioChunks = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
    } catch (error) {
      setError('Error accessing microphone: ' + error.message);
    }
  };

// Update confirmStopRecording to remove chunking references
const confirmStopRecording = async () => {
  if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

  try {
    setShowStopDialog(false);
      mediaRecorderRef.current.stop();
    
    // Clean up
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
      setIsRecording(false);
  } catch (error) {
    console.error('Error stopping recording:', error);
    setError('Failed to stop recording. Please try again.');
    setIsRecording(false);
    setShowStopDialog(false);
    
    // Clean up on error
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
  }
};

const stopRecording = () => {
  if (mediaRecorderRef.current?.state === 'recording') {
    setShowStopDialog(true);
  }
};

const cancelStopRecording = () => {
  setShowStopDialog(false);
};

  // Update the recording handler
  const handleRecordingComplete = async (blob) => {
    try {
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      await handleFileRead(file);
    } catch (error) {
      console.error('Recording processing error:', error);
      setError(error.message || 'Failed to process recording');
    }
  };

  // Add function to split text into chunks for Gemini API
  const processLargeText = async (text, prompt) => {
    const CHUNK_SIZE = 30000; // Characters per chunk
    const chunks = [];
    
    // Split text into chunks
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    let result = '';
    for (let i = 0; i < chunks.length; i++) {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${prompt}\n\nText chunk ${i + 1}/${chunks.length}:\n${chunks[i]}`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process text chunk ' + (i + 1));
      }

      const data = await response.json();
      result += data.candidates[0].content.parts[0].text + ' ';
      
      // Update processing progress
      setProcessingProgress((i + 1) / chunks.length * 100);
    }

    return result.trim();
  };

  // Add copy function
  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${type} copied!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  // Add share function
  const handleShare = async (text, type) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Audio Transcription',
          text: `${type}:\n\n${text}`,
        });
      } else {
        throw new Error('Share not supported');
      }
    } catch (err) {
      handleCopy(text, type);
    }
  };

  // Add function to parse key takeaways
  const parseKeyTakeaways = (text) => {
    if (!text) return [];
    
  if (Array.isArray(text)) return text;
  if (typeof text !== 'string') return [];

    const takeaways = [];
  const sections = text.split(/\d+\./).filter(section => section.trim());

  sections.forEach((section, index) => {
    const lines = section.trim().split('\n').filter(line => line.trim());
    
    // Skip if section is empty
    if (lines.length === 0) return;

    const takeaway = {
      number: index + 1,
      heading: '',
      content: '',
      hashtags: []
    };

    // First non-empty line is the heading
    takeaway.heading = lines[0].trim();

    // Collect all lines between heading and hashtags as content
    const contentLines = [];
    let hashtagIndex = -1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('#')) {
        hashtagIndex = i;
        break;
      }
      contentLines.push(line);
    }

    // Set content and hashtags
    takeaway.content = contentLines.join('\n').trim();
    if (hashtagIndex !== -1 && hashtagIndex < lines.length) {
      takeaway.hashtags = lines[hashtagIndex].split(/\s+/).filter(tag => tag.startsWith('#'));
    }

    // Only add takeaway if it has both heading and content
    if (takeaway.heading && takeaway.content) {
      takeaways.push(takeaway);
    }
  });
    
    return takeaways;
  };

  // Add function to render a single key takeaway
  const renderKeyTakeaway = (takeaway, index) => {
    const takeawayText = `${takeaway.heading}\n\n${takeaway.content}\n\n${takeaway.hashtags}`;
    
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-sm font-medium rounded-full w-6 h-6 flex items-center justify-center">
              {index + 1}
            </span>
            <h3 className="font-semibold text-gray-800">{takeaway.heading}</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleCopy(takeawayText, `Key Takeaway ${index + 1}`)}
            >
              <Copy className="w-3 h-3" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleShare(takeawayText, `Key Takeaway ${index + 1}`)}
            >
              <Share2 className="w-3 h-3" />
              Share
            </Button>
          </div>
        </div>
        
        <p className="text-gray-700">{takeaway.content}</p>
        
        <div className="text-sm text-blue-600 font-medium">
          {takeaway.hashtags}
        </div>
      </div>
    );
  };

  // Update parseResources function to handle more cases
  const parseResources = (text) => {
    if (!text) return [];

    // If text is already an array of resource types, return it as is
    if (Array.isArray(text)) return text;

    // If text is not a string, return empty array
    if (typeof text !== 'string') return [];

    // Split by resource types
    const resourceTypes = text.split(/Resource Type:/)
      .filter(Boolean)
      .map(section => {
        const lines = section.trim().split('\n').filter(Boolean);
        const type = lines[0].trim();
        const resources = [];
        let currentResource = {};

        lines.slice(1).forEach(line => {
      line = line.trim();
          
          // New resource entry
          if (line.match(/^\d+\./)) {
            if (Object.keys(currentResource).length > 0) {
              resources.push(currentResource);
        }
        currentResource = { 
          title: line.replace(/^\d+\./, '').trim(),
          description: '',
          link: '',
              hashtags: []
            };
          }
          // Description line
          else if (line.startsWith('Description:')) {
            currentResource.description = line.replace('Description:', '').trim();
          }
          // Link line
          else if (line.startsWith('Link:')) {
            currentResource.link = line.replace('Link:', '').trim();
          }
          // Hashtags line
          else if (line.startsWith('#')) {
            currentResource.hashtags = line.split(/\s+/).filter(tag => tag.startsWith('#'));
          }
          // Additional description text
          else if (currentResource.title && !line.startsWith('Resource Type:')) {
            if (!currentResource.description) {
        currentResource.description = line;
      }
    }
        });

        // Add the last resource
        if (Object.keys(currentResource).length > 0) {
          resources.push(currentResource);
        }

        return {
          type,
          resources
        };
      });

    // Filter out empty resource types
    return resourceTypes.filter(type => type.resources.length > 0);
  };

    // Helper function to detect Malayalam text
    const isMalayalam = (text) => {
    if (!text) return false;
      return /[\u0D00-\u0D7F]/.test(text);
    };

  const renderText = (text, additionalClasses = '') => {
    const classes = `${isMalayalam(text) ? 'malayalam-text' : ''} ${additionalClasses}`.trim();
    return <p className={classes}>{text}</p>;
  };

  // Update renderTabContent for Summary and Key Takeaways sections
  const renderTabContent = (content, type) => {
    if (type === 'Resources') {
      const resourceTypes = parseResources(content);
      return (
        <div className="space-y-8">
          {resourceTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No resources found in the transcription.
            </div>
          ) : (
            resourceTypes.map((resourceType, typeIndex) => (
                <div key={typeIndex} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
                    <h2 className={`text-xl font-semibold text-gray-900 text-left ${isMalayalam(resourceType.type) ? 'malayalam-text' : ''}`}>
                        {resourceType.type || 'General Resources'}
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resourceType.resources.map((resource, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors">
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  {resource.number || (index + 1)}
                                </span>
                              <h3 className={`text-lg font-semibold text-gray-900 text-left ${isMalayalam(resource.title) ? 'malayalam-text' : ''}`}>
                                  {resource.title}
                                </h3>
                              </div>
                              {resource.description && (
                                <p className={`text-gray-600 mb-3 text-left ${isMalayalam(resource.description) ? 'malayalam-text' : ''}`}>
                                  {resource.description}
                                </p>
                              )}
                            </div>
                          <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleCopy(`${resource.title}\n${resource.description}${resource.link ? '\n' + resource.link : ''}`, `Resource ${resource.number || (index + 1)}`)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleShare(`${resource.title}\n${resource.description}${resource.link ? '\n' + resource.link : ''}`, `Resource ${resource.number || (index + 1)}`)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {resource.link && (
                            <div className="mt-auto pt-2 border-t border-gray-100">
                              <a 
                                href={resource.link}
                                target="_blank"
                                rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium break-all hover:underline text-left"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                {resource.link}
                              </a>
                            </div>
                          )}
                          {resource.hashtags && resource.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3 text-left">
                              {Array.isArray(resource.hashtags) 
                                ? resource.hashtags.map((tag, i) => (
                                    <span key={i} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 ${isMalayalam(tag) ? 'malayalam-text' : ''}`}>
                                      {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                  ))
                                : resource.hashtags.split(/\s+/).filter(tag => tag.startsWith('#')).map((tag, i) => (
                                    <span key={i} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 ${isMalayalam(tag) ? 'malayalam-text' : ''}`}>
                                      {tag}
                                    </span>
                                  ))
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            ))
          )}
        </div>
      );
    }

    if (type === 'Key Takeaways') {
      const takeaways = parseKeyTakeaways(content);
      return (
        <div className="space-y-6">
          {takeaways.map((takeaway, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    {renderText(takeaway.heading, 'text-lg font-semibold text-gray-900 mb-2 text-left')}
                    {renderText(takeaway.content, 'text-gray-600 mb-3 leading-relaxed text-left')}
                    {takeaway.hashtags && (
                      <div className="flex flex-wrap gap-2">
                        {takeaway.hashtags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(`${takeaway.heading}\n${takeaway.content}`, `Key Takeaway ${index + 1}`)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
            >
              <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShare(`${takeaway.heading}\n${takeaway.content}`, `Key Takeaway ${index + 1}`)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
            >
              <Share2 className="w-4 h-4" />
                  </button>
          </div>
            </div>
          </div>
          ))}
        </div>
      );
    }

    // For Summary and Transcription
      return (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex justify-between items-start gap-4">
            <div className="prose max-w-none flex-1">
            {renderText(content, 'text-gray-600 leading-relaxed whitespace-pre-wrap text-left')}
          </div>
          <div className="flex gap-1">
            <button
            onClick={() => handleCopy(content, type)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
          >
            <Copy className="w-4 h-4" />
            </button>
            <button
            onClick={() => handleShare(content, type)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
          >
            <Share2 className="w-4 h-4" />
            </button>
        </div>
          </div>
      </div>
    );
  };

  // Add progress bar component
  const ProgressBar = ({ progress }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
      <div 
        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
      <div className="text-center text-sm text-gray-600 mt-1">
        {progress < 100 ? `Processing: ${Math.round(progress)}%` : 'Complete!'}
      </div>
    </div>
  );

  // Add YouTube video ID extraction function
  const getVideoId = (url) => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Update handleYoutubeExtract to use getVideoId
  const handleYoutubeExtract = async () => {
    if (!youtubeUrl) return;
    setLoading(true);
    setError('');
    setResponse('');
    setSummary('');
    setKeyTakeaways('');
    setResources('');
    setSmoothProgress(0);
    
    try {
      const videoId = getVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL. Please enter a valid YouTube video URL.');
      }

      console.log('Extracting captions for video:', videoId);

      // Call backend endpoint for caption extraction
      const response = await fetch('http://localhost:3001/api/youtube/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          videoId,
          url: youtubeUrl,
          title: 'YouTube Video'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract captions');
      }

      console.log('Received response:', data);
      
      let transcriptText;
      
      if (data.message === 'Transcription found in database') {
        console.log('Found existing transcription');
        // If transcription exists, use it
        const transcription = data.transcription;
        if (!transcription || !transcription.transcription || !transcription.transcription.text) {
          throw new Error('Invalid transcription data received');
        }

        transcriptText = transcription.transcription.text;
        setSmoothProgress(50);
      } else {
        if (!data.transcription || !data.transcription.transcription || !data.transcription.transcription.text) {
          throw new Error('Invalid response format from server');
        }
        transcriptText = data.transcription.transcription.text;
        setSmoothProgress(50);
      }

      if (!transcriptText) {
        throw new Error('No captions found. The video might not have captions enabled.');
      }

      console.log('Setting transcription text');
      setResponse(transcriptText);
      setSmoothProgress(70);
      
      // Always generate fresh analyses using Gemini
      console.log('Generating fresh analyses with Gemini...');
      const [summaryText, keyTakeawaysText, resourcesText] = await Promise.all([
        getSummary(transcriptText),
        getKeyTakeaways(transcriptText),
        getResources(transcriptText)
      ]);

      console.log('Setting analyses results');
      setSummary(summaryText);
      setKeyTakeaways(keyTakeawaysText);
      setResources(resourcesText);
      setSmoothProgress(90);

      // Save everything to MongoDB
      console.log('Saving to MongoDB');
      await saveToMongoDB({
        title: 'YouTube Video',
        source: 'youtube',
        sourceUrl: youtubeUrl,
        transcription: transcriptText,
        summary: summaryText,
        keyTakeaways: keyTakeawaysText,
        resources: resourcesText,
        metadata: {
          videoId: videoId,
          url: youtubeUrl
        }
      });
      setSmoothProgress(100);
      
    } catch (error) {
      console.error('YouTube extraction error:', error);
      setError(error.message || 'Failed to process video');
    } finally {
      setLoading(false);
    }
  };

  const regenerateSummary = async () => {
    try {
      setLoading(true);
      const newSummary = await getSummary(response);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error regenerating summary:', error);
      setError('Failed to regenerate summary');
    } finally {
      setLoading(false);
    }
  };

  const regenerateKeyTakeaways = async () => {
    try {
      setLoading(true);
      const newTakeaways = await getKeyTakeaways(response);
      setKeyTakeaways(newTakeaways);
    } catch (error) {
      console.error('Error regenerating key takeaways:', error);
      setError('Failed to regenerate key takeaways');
    } finally {
      setLoading(false);
    }
  };

  const regenerateResources = async () => {
    try {
      setLoading(true);
      const newResources = await getResources(response);
      setResources(newResources);
    } catch (error) {
      console.error('Error regenerating resources:', error);
      setError('Failed to regenerate resources');
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to fetch audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // First request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Then enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        setAudioDevices(audioInputs);
        
        // Set default device if available
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
        setError('Error accessing microphone. Please ensure microphone permissions are granted.');
      }
    };

    getAudioDevices();

    // Add device change listener
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, []);

  // Add font styles
  const malayalamStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;500;600;700&display=swap');
    
    .malayalam-text {
      font-family: 'Noto Serif Malayalam', serif;
      line-height: 1.8;
      font-size: 1.1em;
    }
    
    /* Ensure proper rendering on all browsers */
    @font-face {
      font-family: 'Noto Serif Malayalam';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url(https://fonts.gstatic.com/s/notoserifmalayalam/v28/JIAZUU5sdj9pHd3IqK5s0gBjwwN-1jNZ.woff2) format('woff2');
      unicode-range: U+0307, U+0323, U+0964-0965, U+0D02-0D7F, U+200C-200D, U+20B9, U+25CC;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500">
      <style>{malayalamStyles}</style>
      {showStopDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stop Recording?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to stop recording? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelStopRecording}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
      {showRetryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Error Occurred</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {savingError ? 
                'There was an error saving your data to the database. Would you like to retry?' :
                'There was an error processing your file. Would you like to retry?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRetryDialog(false);
                  setRetryData(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRetryDialog(false);
                  if (savingError) {
                    retryDatabaseSave();
                  } else if (retryData?.file) {
                    handleFileRead(retryData.file);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.99 6.57 2.57L21 8M21 3v5h-5" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      {saveStatus && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {saveStatus}
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Languages className="w-10 h-10" />
            Multilingual Audio Transcriber
          </h1>
          <p className="text-indigo-100 text-lg">
            Transform your audio into text in multiple languages with AI-powered accuracy
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload Audio
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === 'record'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Mic className="w-5 h-5" />
              Record Audio
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === 'youtube'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Youtube className="w-5 h-5" />
              YouTube Audio
            </button>
          </div>

          <div className="p-8">
            <div className="text-center">
              {activeTab === 'upload' && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-indigo-500 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('audio/')) {
                      handleAudioUpload({ target: { files: [file] } });
                    }
                  }}
                >
                  {!audioFile ? (
                    <>
                <input
                  type="file"
                        accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="audio-upload"
                />
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">Drag and drop your audio file here</p>
                      <p className="text-gray-400 text-sm">or</p>
                      <button 
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        onClick={() => document.getElementById('audio-upload').click()}
                      >
                        Browse Files
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <AudioPlayer file={audioFile} />
                      {loading ? (
                        <div className="space-y-4">
                          <ProgressBar progress={smoothProgress} />
                          <div className="flex items-center justify-center gap-3 text-indigo-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>
                              {smoothProgress < 40 ? 'Processing audio...' :
                               smoothProgress < 70 ? 'Generating transcription...' :
                               smoothProgress < 80 ? 'Creating summary...' :
                               smoothProgress < 90 ? 'Extracting key takeaways...' :
                               smoothProgress < 95 ? 'Finding resources...' :
                               'Saving to database...'}
                            </span>
                  </div>
              </div>
                      ) : response ? (
                        <div className="flex justify-center gap-4">
                          <button
                            onClick={() => {
                              setAudioFile(null);
                              setResponse('');
                              setSummary('');
                              setKeyTakeaways('');
                              setResources('');
                              setActiveResultTab('transcription');
                            }}
                            className="px-6 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Upload New Audio
                          </button>
              </div>
                      ) : (
                        <button
                          onClick={() => handleFileRead(audioFile)}
                          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Start Transcription
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'record' && (
                <div className="bg-gray-50 rounded-lg p-12">
                  {!audioFile ? (
                    <>
                      <div 
                        className={`w-24 h-24 ${
                          isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'
                        } rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:opacity-90 transition-all`}
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        <Mic className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-gray-600 mb-4">
                        {isRecording ? 'Recording... Click to stop' : 'Click the microphone to start recording'}
                      </p>
                      <div className="w-full max-w-md mx-auto">
                        <label htmlFor="microphone-select" className="block text-sm font-medium text-gray-700 mb-2">
                          Select Microphone
                        </label>
                        <div className="relative">
                  <select
                            id="microphone-select"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                    value={selectedDevice || ''}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                            disabled={isRecording}
                  >
                            {audioDevices.length === 0 ? (
                              <option value="">No microphones found</option>
                            ) : (
                              audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                      </option>
                              ))
                            )}
                  </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        {audioDevices.length === 0 && (
                          <p className="mt-2 text-sm text-red-600">
                            No microphones detected. Please connect a microphone and grant permission.
                          </p>
                        )}
                      </div>
                  </>
                ) : (
                    <div className="space-y-4">
                      <AudioPlayer file={audioFile} />
                    {loading ? (
                        <div className="space-y-4">
                          <ProgressBar progress={smoothProgress} />
                          <div className="flex items-center justify-center gap-3 text-indigo-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>
                              {smoothProgress < 40 ? 'Processing audio...' :
                               smoothProgress < 70 ? 'Generating transcription...' :
                               smoothProgress < 80 ? 'Creating summary...' :
                               smoothProgress < 90 ? 'Extracting key takeaways...' :
                               smoothProgress < 95 ? 'Finding resources...' :
                               'Saving to database...'}
                </span>
              </div>
                        </div>
                      ) : response ? (
                        <div className="flex justify-center gap-4">
                          <button
                onClick={() => {
                  setAudioFile(null);
                  setResponse('');
                              setSummary('');
                              setKeyTakeaways('');
                              setResources('');
                              setActiveResultTab('transcription');
                            }}
                            className="px-6 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Record New Audio
                          </button>
            </div>
                      ) : (
                        <button
                          onClick={() => handleFileRead(audioFile)}
                          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Start Transcription
                        </button>
                      )}
                  </div>
                  )}
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className="bg-gray-50 rounded-lg p-12">
                  <Youtube className="w-12 h-12 mx-auto text-red-600 mb-4" />
                  <div className="flex flex-col space-y-4">
                      <input
                        type="text"
                        placeholder="Paste YouTube URL here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                      <button
                      className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                        onClick={handleYoutubeExtract}
                        disabled={!youtubeUrl || loading}
                      >
                        {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Extracting...
                </div>
                        ) : (
                          'Extract Audio'
                        )}
                      </button>
              </div>
                </div>
          )}

          {response && (
                <div className="mt-8">
                  {/* Improved tabs navigation */}
                  <nav className="flex items-center justify-between border-b mb-6">
                    <div className="flex -mb-px">
                      <button
                        onClick={() => setActiveResultTab('transcription')}
                        className={`mr-8 py-4 ${
                      activeResultTab === 'transcription' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
                            : 'text-gray-500 hover:text-gray-700'
                        } flex items-center gap-2 transition-colors`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="21" y2="3" />
                        </svg>
                    Full Transcription
                      </button>
                      <button
                        onClick={() => setActiveResultTab('summary')}
                        className={`mr-8 py-4 ${
                      activeResultTab === 'summary' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
                            : 'text-gray-500 hover:text-gray-700'
                        } flex items-center gap-2 transition-colors`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H8" />
                        </svg>
                    Summary
                      </button>
                      <button
                        onClick={() => setActiveResultTab('keytakeaways')}
                        className={`mr-8 py-4 ${
                      activeResultTab === 'keytakeaways' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
                            : 'text-gray-500 hover:text-gray-700'
                        } flex items-center gap-2 transition-colors`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                    Key Takeaways
                      </button>
                      <button
                        onClick={() => setActiveResultTab('resources')}
                        className={`py-4 ${
                      activeResultTab === 'resources' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
                            : 'text-gray-500 hover:text-gray-700'
                        } flex items-center gap-2 transition-colors`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 21 16z" />
                          <polyline points="3.29 7 12 12 20.71 7" />
                          <line x1="12" y1="22" x2="12" y2="12" />
                        </svg>
                    Resources
                      </button>
                    </div>
                  </nav>

                  {/* Content area with improved styling */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-6">
                      {/* Tab header with title and actions */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {activeResultTab === 'transcription' && 'Full Transcription'}
                          {activeResultTab === 'summary' && 'Summary'}
                          {activeResultTab === 'keytakeaways' && 'Key Takeaways'}
                          {activeResultTab === 'resources' && 'Available Resources'}
                        </h2>
                        
                          <div className="flex items-center gap-3">
                          {activeResultTab !== 'transcription' && (
                            <button
                              onClick={
                                activeResultTab === 'summary' ? regenerateSummary :
                                activeResultTab === 'keytakeaways' ? regenerateKeyTakeaways :
                                regenerateResources
                              }
                              disabled={loading}
                              className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 hover:text-indigo-700 border-2 border-indigo-600 rounded hover:border-indigo-700 transition-colors disabled:opacity-50"
                            >
                              {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                                </svg>
                              )}
                              <span className="text-sm">{loading ? 'Regenerating...' : 'Regenerate'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(
                              activeResultTab === 'transcription' ? response :
                              activeResultTab === 'summary' ? summary :
                              activeResultTab === 'keytakeaways' ? keyTakeaways :
                              resources,
                              activeResultTab
                            )}
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-indigo-600 border rounded hover:border-indigo-600 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            <span className="text-sm">Copy All</span>
                            </button>
                            <button
                            onClick={() => handleShare(
                              activeResultTab === 'transcription' ? response :
                              activeResultTab === 'summary' ? summary :
                              activeResultTab === 'keytakeaways' ? keyTakeaways :
                              resources,
                              activeResultTab
                            )}
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-indigo-600 border rounded hover:border-indigo-600 transition-colors"
                            >
                              <Share2 className="w-4 h-4" />
                            <span className="text-sm">Share All</span>
                            </button>
                          </div>
                      </div>

                      {/* Content with consistent styling */}
                      <div className="prose max-w-none">
                        {renderTabContent(
                          activeResultTab === 'transcription' ? response :
                          activeResultTab === 'summary' ? summary :
                          activeResultTab === 'keytakeaways' ? keyTakeaways :
                          resources,
                          activeResultTab === 'transcription' ? 'Full Transcription' :
                          activeResultTab === 'summary' ? 'Summary' :
                          activeResultTab === 'keytakeaways' ? 'Key Takeaways' :
                          'Resources'
                        )}
                      </div>
                    </div>
                  </div>
            </div>
          )}
            </div>
          </div>

          <div className="bg-gray-50 p-8 border-t">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Languages className="w-8 h-8 mx-auto text-indigo-600 mb-3" />
                <h3 className="font-semibold mb-2">Multiple Languages</h3>
                <p className="text-gray-600 text-sm">Support for 50+ languages</p>
              </div>
              <div className="text-center">
                <Wand2 className="w-8 h-8 mx-auto text-indigo-600 mb-3" />
                <h3 className="font-semibold mb-2">AI-Powered</h3>
                <p className="text-gray-600 text-sm">High accuracy transcription</p>
              </div>
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto text-indigo-600 mb-3" />
                <h3 className="font-semibold mb-2">Easy Export</h3>
                <p className="text-gray-600 text-sm">Download in multiple formats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default GeminiAudioApp; 