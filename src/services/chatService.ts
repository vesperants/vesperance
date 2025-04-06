/**
 * Chat Service
 *
 * Handles communication with the backend chat API.
 */
import type { Content } from '@google/genai';

// Define the structure for file payloads expected by the API
interface FilePayload {
  data: string; // Base64 encoded string
  mimeType: string;
}

/**
 * Sends a message, chat history, and optional files to the backend chat API.
 * Returns a ReadableStream for processing the response.
 *
 * @param message The user's current message.
 * @param history The previous chat history (mapped to API format).
 * @param files An array of file payloads (base64 string + mimeType).
 * @param signal An AbortSignal to allow cancelling the request.
 * @returns A Promise resolving to the fetch Response object.
 * @throws Will throw an error if the fetch request itself fails.
 */
export const sendMessageToApi = async (
  message: string,
  history: Content[],
  files: FilePayload[],
  signal: AbortSignal
): Promise<Response> => {
  // The fetch logic previously in handleSendMessage will go here.
  // For now, just setting up the function signature.
  console.log("Sending to API:", { message, historyLength: history.length, filesLength: files.length });

  // Placeholder implementation - Replace with actual fetch call
   const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        history: history,
        files: files
      }),
      signal: signal // Pass the signal here
    });

   return response; // Return the raw response object
}; 