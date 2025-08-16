// Types for OneRouter API
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OneRouter API configuration
const ONE_ROUTER_API_URL = 'https://app.onerouter.pro/v1';
const DEFAULT_MODEL = 'claude-3-5-sonnet@20240620';

/**
 * Send a message to OneRouter API and get the AI response
 * @param messages Array of messages from Chat component
 * @param model AI model to use (defaults to claude-3-5-sonnet@20240620)
 * @returns Promise with the assistant's response text
 */
export const sendChatMessage = async (
  messages: { role: "user" | "assistant"; text: string }[],
  model: string = DEFAULT_MODEL
): Promise<string> => {
  try {
    // Get API key from environment variables
    const apiKey = import.meta.env.VITE_API_KEY;
    
    if (!apiKey) {
      console.error('OneRouter API key not found in environment variables');
      throw new Error('API key not configured');
    }
    
    // Format messages for the API
    const formattedMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.text,
    }));
    
    // Make API request
    const response = await fetch(`${ONE_ROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`OneRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract assistant's response
    const assistantMessage = data.choices[0]?.message;
    return assistantMessage?.content || '';
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};