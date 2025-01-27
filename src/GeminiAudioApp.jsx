import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Mic, Loader2, Upload, Circle, AlertCircle, Wand2, Youtube, Settings, Copy, Share2, Save, Languages, Play, Pause, X, Volume2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

const API_KEY = 'AIzaSyCO5VieNatnPYYqK-0XJ7eUOYsgxmDCTtg';
const CORS_PROXY = 'https://corsproxy.io/';

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
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Create object URL when file changes
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      // Reset state
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      
      // Cleanup old URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        if (!isDragging && isFinite(audio.currentTime)) {
          setCurrentTime(audio.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        if (isFinite(audio.duration)) {
          setDuration(audio.duration);
        } else {
          setDuration(0);
        }
      };

      const handleLoadedData = () => {
        if (isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);

      // Try to load duration immediately if already available
      if (audio.readyState >= 1 && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, [audioRef.current, isDragging]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => {
          console.error('Playback failed:', e);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    const time = percentage * duration;
    
    if (audioRef.current && !isNaN(time) && isFinite(time) && time >= 0 && time <= duration) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDrag = (e) => {
    if (isDragging && audioRef.current) {
      handleSeek(e);
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const formatTime = (time) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 relative h-2 bg-gray-200 rounded cursor-pointer group"
              onClick={handleSeek}
              onMouseDown={handleDragStart}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <div 
                className="absolute h-full bg-indigo-600 rounded"
                style={{ 
                  width: `${(duration && isFinite(duration) && duration > 0) ? 
                    Math.min((currentTime / duration) * 100, 100) : 0}%` 
                }}
              />
              <div 
                className="absolute h-4 w-4 bg-indigo-600 rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ 
                  left: `${(duration && isFinite(duration) && duration > 0) ? 
                    Math.min((currentTime / duration) * 100, 100) : 0}%`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none'
                }}
              />
            </div>
            <span className="text-sm text-gray-500">{formatTime(duration || 0)}</span>
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
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
    </div>
  );
};

const GeminiAudioApp = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [response, setResponse] = useState('');
  const [summary, setSummary] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [resources, setResources] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('transcription');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  // Load YouTube IFrame API and get audio devices
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Get available audio devices
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
        setError('Error accessing audio devices: ' + error.message);
      }
    };

    getAudioDevices();
  }, []);

  const getVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /^[^"&?\/\s]{11}$/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Add font style
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600;700&display=swap');

    .malayalam-text {
      font-family: 'Noto Serif Malayalam', serif;
    }

    .progress-animation {
      animation: progress 30s linear;
    }
    @keyframes progress {
      from { width: 0; }
      to { width: 100%; }
    }
  `;

  // Add automatic save function
  const saveToMongoDB = async (transcriptionText, summaryText, keyTakeawaysText, resourcesText) => {
    try {
      const transcriptionData = {
        title: audioFile?.name || youtubeUrl || 'Transcription',
        source: youtubeUrl ? 'youtube' : (audioFile ? 'upload' : 'recording'),
        sourceUrl: youtubeUrl || null,
        transcription: {
          text: transcriptionText,
          languages: ['en'],
          duration: 0
        },
        summary: summaryText || '',
        keyTakeaways: parseKeyTakeaways(keyTakeawaysText).map(takeaway => ({
          heading: takeaway.heading || '',
          content: takeaway.content || '',
          hashtags: takeaway.hashtags ? takeaway.hashtags.split(' ').filter(Boolean) : []
        })),
        resources: parseResources(resourcesText).flatMap(type => 
          type.resources.map(resource => ({
            type: type.type || 'other',
            title: resource.title || '',
            description: resource.description || '',
            link: resource.link || '',
            hashtags: resource.hashtags ? resource.hashtags.split(' ').filter(Boolean) : []
          }))
        ),
        metadata: {
          fileSize: audioFile?.size || 0,
          mimeType: audioFile?.type || 'text/plain',
          originalFilename: audioFile?.name || 'transcription',
          processingDuration: Date.now()
        }
      };

      const apiResponse = await fetch('http://localhost:3001/api/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transcriptionData)
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to save transcription');
      }

      console.log('Transcription saved successfully');
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
    }
  };

  // Update handleYoutubeExtract to save automatically
  const handleYoutubeExtract = async () => {
    if (!youtubeUrl) return;
    setLoading(true);
    setError('');
    setResponse('');
    setSummary('');
    setKeyTakeaways('');
    setResources('');
    
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
      } else {
        if (!data.transcription || !data.transcription.transcription || !data.transcription.transcription.text) {
          throw new Error('Invalid response format from server');
        }
        transcriptText = data.transcription.transcription.text;
      }

      if (!transcriptText) {
        throw new Error('No captions found. The video might not have captions enabled.');
      }

      console.log('Setting transcription text');
      setResponse(transcriptText);
      
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

      // Save everything to MongoDB
      console.log('Saving to MongoDB');
      await saveToMongoDB(transcriptText, summaryText, keyTakeawaysText, resourcesText);
      
    } catch (error) {
      console.error('YouTube extraction error:', error);
      setError(error.message || 'Failed to process video');
    } finally {
      setLoading(false);
    }
  };

  // Add retry logic with exponential backoff
  const retryWithBackoff = async (fn, retries = 3, baseDelay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
      }
    }
  };

  // Update handleFileRead to save automatically
  const handleFileRead = async (file, onUploadProgress, onProcessingProgress) => {
    // Reset progress
    onUploadProgress(0);
    onProcessingProgress(0);
    setSmoothProgress(0);

    if (file.size > 20 * 1024 * 1024) {
      // Handle large files with smaller chunks and more parallel processing
      const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let transcription = new Array(totalChunks);
      let uploadedChunks = 0;
      let processedChunks = 0;

      // Process chunks in parallel, 4 at a time
      const processChunkBatch = async (startIdx) => {
        const PARALLEL_CHUNKS = 4;
        const batchPromises = [];

        for (let i = 0; i < PARALLEL_CHUNKS && startIdx + i < totalChunks; i++) {
          const chunkIndex = startIdx + i;
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          let chunkData = file.slice(start, end);

          batchPromises.push((async () => {
            try {
              // Upload chunk with retry
              const base64Chunk = await retryWithBackoff(async () => {
                const result = await readChunkAsBase64(chunkData);
                uploadedChunks++;
                const uploadPercent = Math.floor((uploadedChunks / totalChunks) * 100);
                onUploadProgress(uploadPercent);
                return result;
              });

              // Process chunk with retry
              const chunkTranscription = await retryWithBackoff(async () => {
                const result = await processAudioChunk(base64Chunk, file.type);
                processedChunks++;
                const processingPercent = Math.floor((processedChunks / totalChunks) * 100);
                onProcessingProgress(processingPercent);
                
                // Update smooth progress based on both upload and processing
                const totalProgress = Math.floor(
                  ((uploadedChunks + processedChunks) / (totalChunks * 2)) * 100
                );
                setSmoothProgress(totalProgress);
                
                return result;
              });

              transcription[chunkIndex] = chunkTranscription;
            } finally {
              // Clear chunk data to help GC
              chunkData = null;
            }
          })());
        }

        await Promise.all(batchPromises);
      };

      // Process all chunks in batches
      for (let i = 0; i < totalChunks; i += 4) {
        await processChunkBatch(i);
      }

      // Ensure progress reaches 100%
      onUploadProgress(100);
      onProcessingProgress(100);
      setSmoothProgress(100);

      // Join chunks and clean up
      const result = transcription.join(' ').trim();
      transcription = null;

      // Generate analyses in parallel
      const [summaryText, keyTakeawaysText, resourcesText] = await Promise.all([
        getSummary(result),
        getKeyTakeaways(result),
        getResources(result)
      ]);

      // Save everything to MongoDB
      await saveToMongoDB(result, summaryText, keyTakeawaysText, resourcesText);

      return result;

    } else {
      // Handle smaller files with improved progress tracking
      let base64Data = null;
      try {
        // Upload phase
        base64Data = await retryWithBackoff(async () => {
          const result = await readFileAsBase64(file, (progress) => {
            onUploadProgress(progress);
            setSmoothProgress(Math.floor(progress / 2)); // First 50%
          });
          return result;
        });

        onUploadProgress(100);
        setSmoothProgress(50);

        // Processing phase
        const result = await retryWithBackoff(async () => {
          const transcription = await processAudioFile(base64Data, file.type);
          onProcessingProgress(100);
          setSmoothProgress(100);
          return transcription;
        });

        // Generate analyses in parallel
        const [summaryText, keyTakeawaysText, resourcesText] = await Promise.all([
          getSummary(result),
          getKeyTakeaways(result),
          getResources(result)
        ]);

        // Save everything to MongoDB
        await saveToMongoDB(result, summaryText, keyTakeawaysText, resourcesText);

        return result;
      } finally {
        // Clear data to help GC
        if (base64Data) {
          base64Data = null;
        }
      }
    }
  };

  const readChunkAsBase64 = (chunk) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result.split(',')[1];
        reader.onload = null; // Clear handler to help GC
        resolve(result);
      };
      reader.onerror = (error) => {
        reader.onerror = null; // Clear handler
        reject(error);
      };
      reader.readAsDataURL(chunk);
    });
  };

  const readFileAsBase64 = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      
      reader.onload = () => {
        const result = reader.result.split(',')[1];
        // Clean up event handlers
        reader.onload = null;
        reader.onprogress = null;
        reader.onerror = null;
        resolve(result);
      };

      reader.onerror = (error) => {
        // Clean up event handlers
        reader.onload = null;
        reader.onprogress = null;
        reader.onerror = null;
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  };

  const processAudioChunk = async (base64Data, mimeType) => {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Transcribe this audio chunk. Keep original languages."
              }, {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }]
            }]
          })
        }
      );

      if (!response.ok) throw new Error('Processing failed');
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } finally {
      // No need to clear base64Data here as it's handled by the caller
    }
  };

  const processAudioFile = async (base64Data, mimeType) => {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Transcribe this audio. Keep original languages. Format in paragraphs."
              }, {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }]
            }]
          })
        }
      );

      if (!response.ok) throw new Error('Processing failed');
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } finally {
      // No need to clear base64Data here as it's handled by the caller
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Error: File size must be under 50MB');
        return;
      }
      setLoading(true);
      setAudioFile(file);
      setError('');
      setResponse('');
      
      try {
        const transcription = await handleFileRead(
          file,
          setUploadProgress,
          setProcessingProgress
        );
        
        setResponse(transcription);

        // Generate analyses in parallel
        const [summaryText, keyTakeawaysText, resourcesText] = await Promise.all([
          getSummary(transcription),
          getKeyTakeaways(transcription),
          getResources(transcription)
        ]);

        setSummary(summaryText);
        setKeyTakeaways(keyTakeawaysText);
        setResources(resourcesText);
        
      } catch (error) {
        setError('Error: ' + error.message);
        console.error('Upload/Processing error:', error);
      } finally {
        setLoading(false);
        setUploadProgress(0);
        setProcessingProgress(0);
      }
    }
  };

  const startRecording = async () => {
    try {
      const constraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        setAudioFile(file);
        setError('');
        setLoading(true);
        
        try {
          const transcription = await handleFileRead(
            file,
            setUploadProgress,
            setProcessingProgress
          );
          
          setResponse(transcription);

          // Generate analyses in parallel
          const [summaryText, keyTakeawaysText, resourcesText] = await Promise.all([
            getSummary(transcription),
            getKeyTakeaways(transcription),
            getResources(transcription)
          ]);

          setSummary(summaryText);
          setKeyTakeaways(keyTakeawaysText);
          setResources(resourcesText);
          
        } catch (error) {
          setError('Error: ' + error.message);
          console.error('Processing error:', error);
        } finally {
          setLoading(false);
          setUploadProgress(0);
          setProcessingProgress(0);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
    } catch (error) {
      setError('Error accessing microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
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

  // Add retry logic for Gemini API calls
  const callGeminiAPI = async (prompt, text, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        // Add delay between retries
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }

        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + API_KEY,
          {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
                  text: `${prompt}\n\n${text}`
            }]
          }]
        })
          }
        );

      if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error (attempt ${i + 1}):`, errorText);
          
          // If we get rate limited, wait longer
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retrying after error (attempt ${i + 1}):`, error);
      }
    }
  };

  // Update getSummary function
  const getSummary = async (transcription) => {
    try {
      if (transcription.length > 30000) {
        return await processLargeText(transcription, 
          "Summarise the transcription in a short manner. Use same language of the transcription."
        );
      }

      return await callGeminiAPI(
        "Summarise the transcription in a short manner. Use same language of the transcription:",
        transcription
      );
    } catch (error) {
      console.error('Summary generation error:', error);
      throw error;
    }
  };

  const getKeyTakeaways = async (transcription) => {
    try {
      return await callGeminiAPI(
        `You should provide the keytakeways of the following transcribed text in the format:

no.
Key Take away Heading
keytake away in max 2-3 sentences
relevant key take away hashtags in english

Do not add anything other than these elements in the completion. Provide output in the same language as the transcription. Ensure all the content are covered. min 10 keytakeways

Transcription:`,
        transcription
      );
    } catch (error) {
      console.error('Key takeaways generation error:', error);
      throw error;
    }
  };

  const getResources = async (transcription) => {
    try {
      return await callGeminiAPI(
        `Extract and organize resources mentioned in the transcription in the following format:

Resource Type: [Type Name]
1. [Resource Title]
[2-3 sentence description of the resource and its relevance]
[URL or reference if available]
#[relevant hashtag] #[relevant hashtag] #[relevant hashtag]

2. [Next Resource Title]
[Description]
[URL]
#[hashtags]

Resource Type: [Next Type]
1. [Resource Title]
[Description]
[URL]
#[hashtags]

Important Notes:
- Group similar resources under clear type headings (Books, Articles, Tools, etc.)
- output must be in original language of transcription
- Each resource must have a title and description
- Add relevant hashtags for each resource
- Include URLs where available USING GOOGLE GROUNDING
- Keep descriptions focused and valuable
- Number resources within each type

Transcription:`,
        transcription
      );
    } catch (error) {
      console.error('Resources generation error:', error);
      throw error;
    }
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
    
    // If text is already an array of takeaways, return it as is
    if (Array.isArray(text)) {
      return text;
    }
    
    // If text is not a string, return empty array
    if (typeof text !== 'string') {
      return [];
    }

    const takeaways = [];
    let currentTakeaway = { number: '', heading: '', content: '', hashtags: '' };
    
    const lines = text.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (/^\d+\.?$/.test(line)) {
        // If we have a previous takeaway, save it
        if (currentTakeaway.heading) {
          takeaways.push({ ...currentTakeaway });
        }
        currentTakeaway = { number: line, heading: '', content: '', hashtags: '' };
      } else if (currentTakeaway.number && !currentTakeaway.heading) {
        currentTakeaway.heading = line;
      } else if (currentTakeaway.heading && !currentTakeaway.content) {
        currentTakeaway.content = line;
      } else if (line.includes('#')) {
        currentTakeaway.hashtags = line;
        takeaways.push({ ...currentTakeaway });
        currentTakeaway = { number: '', heading: '', content: '', hashtags: '' };
      }
    }
    
    // Add the last takeaway if exists
    if (currentTakeaway.heading) {
      takeaways.push(currentTakeaway);
    }
    
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

  // Update parseResources function to handle the new format
  const parseResources = (text) => {
    if (!text) return [];

    // If text is already an array of resource types, return it as is
    if (Array.isArray(text)) {
      return text;
    }

    // If text is not a string, return empty array
    if (typeof text !== 'string') {
      return [];
    }

    const resourceTypes = [];
    let currentType = { type: '', resources: [] };
    let currentResource = { number: '', title: '', description: '', link: '', hashtags: '' };
    
    const lines = text.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.startsWith('Resource Type:')) {
        // Save previous type if it exists
        if (currentType.type && currentResource.title) {
          currentType.resources.push({ ...currentResource });
          resourceTypes.push({ ...currentType });
        } else if (currentType.type) {
          resourceTypes.push({ ...currentType });
        }
        currentType = { type: line.replace('Resource Type:', '').trim(), resources: [] };
        currentResource = { number: '', title: '', description: '', link: '', hashtags: '' };
      } else if (line.match(/^\d+\./)) {
        // Save previous resource if it exists
        if (currentResource.title) {
          currentType.resources.push({ ...currentResource });
        }
        currentResource = { 
          number: line.match(/^\d+/)[0], 
          title: line.replace(/^\d+\./, '').trim(),
          description: '',
          link: '',
          hashtags: ''
        };
      } else if (line.startsWith('#')) {
        currentResource.hashtags = line;
      } else if (line.startsWith('http') || line.includes('www.')) {
        currentResource.link = line;
      } else if (currentResource.title && !currentResource.description) {
        currentResource.description = line;
      }
    }
    
    // Add the last resource and type if they exist
    if (currentResource.title) {
      currentType.resources.push(currentResource);
    }
    if (currentType.type) {
      resourceTypes.push(currentType);
    }
    
    return resourceTypes;
  };

  // Update renderTabContent for Resources with improved layout
  const renderTabContent = (content, type) => {
    // Helper function to detect Malayalam text
    const isMalayalam = (text) => {
      return /[\u0D00-\u0D7F]/.test(text);
    };

    const textClassName = isMalayalam(content) ? 'malayalam-text' : '';

    if (type === 'Resources') {
      const resourceTypes = parseResources(content);
    return (
        <div className="space-y-8">
          {resourceTypes.map((resourceType, typeIndex) => (
            <div key={typeIndex} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {resourceType.type}
                  </h2>
              </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(resourceType.resources.map(r => 
                      `${r.title}\n${r.description}${r.link ? '\n' + r.link : ''}`
                    ).join('\n\n'), resourceType.type)}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-indigo-600 border rounded hover:border-indigo-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy</span>
                  </button>
                  <button
                    onClick={() => handleShare(resourceType.resources.map(r => 
                      `${r.title}\n${r.description}${r.link ? '\n' + r.link : ''}`
                    ).join('\n\n'), resourceType.type)}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-indigo-600 border rounded hover:border-indigo-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                    <span className="text-sm">Share</span>
                  </button>
            </div>
          </div>
              <div className="grid gap-4">
                {resourceType.resources.map((resource, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {resource.number}
                          </span>
                          <h3 className={`text-lg font-semibold text-gray-900 ${isMalayalam(resource.title) ? 'malayalam-text' : ''}`}>
                            {resource.title}
                          </h3>
                        </div>
                        <p className={`text-gray-600 mb-3 text-left ${isMalayalam(resource.description) ? 'malayalam-text' : ''}`}>
                          {resource.description}
                        </p>
          {resource.link && (
            <a 
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Visit Resource
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCopy(`${resource.title}\n${resource.description}${resource.link ? '\n' + resource.link : ''}`, `Resource ${resource.number}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
              >
                <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShare(`${resource.title}\n${resource.description}${resource.link ? '\n' + resource.link : ''}`, `Resource ${resource.number}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
              >
                <Share2 className="w-4 h-4" />
                        </button>
            </div>
          </div>
            </div>
                ))}
              </div>
            </div>
          ))}
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
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold text-gray-900 mb-2 text-left ${isMalayalam(takeaway.heading) ? 'malayalam-text' : ''}`}>
                      {takeaway.heading}
                    </h3>
                    <p className={`text-gray-600 mb-3 leading-relaxed text-left ${isMalayalam(takeaway.content) ? 'malayalam-text' : ''}`}>
                      {takeaway.content}
                    </p>
                    {takeaway.hashtags && (
                      <div className="flex flex-wrap gap-2">
                        {takeaway.hashtags.split(' ').map((tag, i) => (
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
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="prose max-w-none flex-1">
            <p className={`text-gray-600 leading-relaxed whitespace-pre-wrap text-left ${textClassName}`}>
              {content}
            </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500">
      <style>{styles}</style>
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
                        <div className="flex items-center justify-center gap-3 text-indigo-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
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
                      <select 
                        className="w-full max-w-md mx-auto block px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={selectedDevice || ''}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                      >
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <AudioPlayer file={audioFile} />
                      {loading ? (
                        <div className="flex items-center justify-center gap-3 text-indigo-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
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
                  <input
                    type="text"
                    placeholder="Paste YouTube URL here"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full max-w-md mx-auto block px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                  />
                  <button 
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                    onClick={handleYoutubeExtract} 
                    disabled={!youtubeUrl || loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting...
                      </div>
                    ) : (
                      'Extract Audio'
                    )}
                  </button>
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
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <line x1="10" y1="9" x2="8" y2="9" />
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
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
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
                        
                        {activeResultTab === 'resources' && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleCopy(resources, 'Resources')}
                              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 border rounded-lg hover:border-indigo-600 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                              <span className="text-sm font-medium">Copy All</span>
                            </button>
                            <button
                              onClick={() => handleShare(resources, 'Resources')}
                              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 border rounded-lg hover:border-indigo-600 transition-colors"
                            >
                              <Share2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Share All</span>
                            </button>
                          </div>
                        )}
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
    </div>
  );
};

export default GeminiAudioApp; 