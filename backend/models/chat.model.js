import mongoose from 'mongoose';

const ChatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [{
    sender: { type: String, enum: ['user', 'bot'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
export const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);