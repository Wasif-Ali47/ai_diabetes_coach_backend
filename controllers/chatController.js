import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { generateChatResponse } from '../services/openaiService.js';
import { validationResult } from 'express-validator';

/**
 * Send message and get AI response
 */
export const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { message } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent chat history for context
    const recentMessages = await ChatMessage.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('message isUser')
      .lean();

    // Save user message
    const userMessage = new ChatMessage({
      userId: req.userId,
      message,
      isUser: true
    });
    await userMessage.save();

    try {
      // Generate AI response using OpenAI
      const aiResponse = await generateChatResponse(
        message,
        user,
        recentMessages.reverse()
      );

      // Save AI response
      const aiMessage = new ChatMessage({
        userId: req.userId,
        message: aiResponse.text,
        isUser: false,
        confidence: aiResponse.confidence,
        responseType: aiResponse.type
      });
      await aiMessage.save();

      res.json({
        success: true,
        userMessage: {
          id: userMessage._id,
          message: userMessage.message,
          isUser: true,
          createdAt: userMessage.createdAt
        },
        aiMessage: {
          id: aiMessage._id,
          message: aiMessage.message,
          isUser: false,
          confidence: aiMessage.confidence,
          responseType: aiMessage.responseType,
          createdAt: aiMessage.createdAt
        }
      });
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError);
      
      // Fallback response if OpenAI fails
      const fallbackResponse = getFallbackResponse(message, user);
      
      const aiMessage = new ChatMessage({
        userId: req.userId,
        message: fallbackResponse.text,
        isUser: false,
        confidence: fallbackResponse.confidence,
        responseType: fallbackResponse.type
      });
      await aiMessage.save();

      res.json({
        success: true,
        userMessage: {
          id: userMessage._id,
          message: userMessage.message,
          isUser: true,
          createdAt: userMessage.createdAt
        },
        aiMessage: {
          id: aiMessage._id,
          message: aiMessage.message,
          isUser: false,
          confidence: aiMessage.confidence,
          responseType: aiMessage.responseType,
          createdAt: aiMessage.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: error.message
    });
  }
};

/**
 * Get chat history
 */
export const getChatHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const messages = await ChatMessage.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Reverse to show oldest first
    messages.reverse();

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error.message
    });
  }
};

/**
 * Clear chat history
 */
export const clearChatHistory = async (req, res) => {
  try {
    await ChatMessage.deleteMany({ userId: req.userId });

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    });
  }
};

/**
 * Fallback response if OpenAI fails
 */
function getFallbackResponse(userMessage, user) {
  const lowerMessage = userMessage.toLowerCase();
  let response;
  let confidence = 0.75;
  let type = 'default';

  if (lowerMessage.includes('blood sugar') || lowerMessage.includes('glucose') || lowerMessage.includes('diabetes')) {
    response = 'For managing blood sugar, focus on low-GI foods like whole grains, legumes, and non-starchy vegetables. Consider spacing meals evenly throughout the day and monitoring your levels regularly.';
    confidence = 0.88;
    type = 'blood_sugar';
  } else if (lowerMessage.includes('meal') || lowerMessage.includes('plan') || lowerMessage.includes('food') || lowerMessage.includes('diet')) {
    response = 'Your meal plan is personalized based on your health conditions and preferences. Check your "My Plan" section for detailed meal recommendations.';
    confidence = 0.92;
    type = 'meal_plan';
  } else if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('pill')) {
    response = 'It\'s important to take medications as prescribed. Some medications may interact with certain foods - always consult your doctor about dietary restrictions.';
    confidence = 0.85;
    type = 'medication';
  } else if (lowerMessage.includes('symptom') || lowerMessage.includes('track') || lowerMessage.includes('log')) {
    response = 'Tracking symptoms helps identify patterns. Log your symptoms regularly and share trends with your healthcare provider for better management.';
    confidence = 0.90;
    type = 'symptoms';
  } else {
    response = 'I understand you\'re asking about nutrition and health. For personalized advice, I recommend consulting with your healthcare provider. I can help with general information about meal planning, tracking, and reminders.';
    confidence = 0.75;
    type = 'default';
  }

  if (user.healthConditions && user.healthConditions.length > 0) {
    const conditions = user.healthConditions.join(', ');
    response += ` Based on your conditions (${conditions}), make sure to follow your personalized plan.`;
  }

  return { text: response, confidence, type };
}
