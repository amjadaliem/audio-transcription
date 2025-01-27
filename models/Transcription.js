import mongoose from 'mongoose';

const transcriptionSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: ['youtube', 'upload', 'recording'],
    required: true
  },
  sourceUrl: {
    type: String,
    trim: true,
    // Required only for YouTube videos
    required: function() {
      return this.source === 'youtube';
    }
  },

  // Content
  transcription: {
    text: { type: String, required: true },
    languages: [{ type: String }], // List of detected languages
    duration: Number, // Duration in seconds
  },

  // Analysis
  summary: {
    type: String,
    default: '' // Make summary optional with empty default
  },
  keyTakeaways: [{
    heading: String,
    content: String,
    hashtags: [String]
  }],
  resources: [{
    type: {
      type: String,
      required: true
    },
    title: String,
    description: String,
    link: String,
    hashtags: [String]
  }],

  // Metadata
  metadata: {
    fileSize: Number, // in bytes
    mimeType: String,
    originalFilename: String,
    processingDuration: Number // Time taken to process in ms
  },

  // Add a type field to distinguish transcription documents
  documentType: {
    type: String,
    default: 'transcription'
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'saves', // Use the existing 'saves' collection
  strict: false // Allow flexible schema
});

// Only create model if it doesn't exist
export default mongoose.models.Transcription || mongoose.model('Transcription', transcriptionSchema);

// Add indexes only if they don't exist
if (!mongoose.models.Transcription.collection.conn.models.Transcription.schema.indexes().length) {
  mongoose.models.Transcription.collection.createIndex({ createdAt: -1 });
  mongoose.models.Transcription.collection.createIndex({ 'transcription.languages': 1 });
  mongoose.models.Transcription.collection.createIndex({ source: 1 });
} 