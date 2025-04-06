import { NextRequest } from 'next/server';
import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';

// Define the expected request body structure from the frontend
interface ChatRequestBody {
  message: string;
  history: Content[];
  files?: { data: string; mimeType: string }[]; // Optional array for file data
}

/**
 * POST handler for the /api/chat endpoint.
 * Receives a user message, conversation history, and optional files,
 * forwards them to the Gemini API using streaming, and returns the bot's reply as a stream.
 * 
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<Response>} - A stream of text from Gemini API.
 */
export async function POST(request: NextRequest): Promise<Response> {
  // 1. Get Gemini API Key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    return new Response(JSON.stringify({ 
      error: 'API key not configured', 
      details: 'The Gemini API key is missing on the server.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 2. Parse the incoming request body from the frontend
    const body: ChatRequestBody = await request.json();
    const userMessage = body.message;
    const history = body.history || [];
    const files = body.files || []; // Extract files, default to empty array

    // Basic validation for message (allow empty message if files are present)
    if (typeof userMessage !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message format' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure at least a message or files are present
    if (userMessage.trim().length === 0 && files.length === 0) {
      return new Response(JSON.stringify({ error: 'Cannot send empty message without files' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic validation for history
    if (!Array.isArray(history)) {
       return new Response(JSON.stringify({ error: 'Invalid history format' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic validation for files
    if (!Array.isArray(files) || !files.every(file => typeof file.data === 'string' && typeof file.mimeType === 'string')) {
      return new Response(JSON.stringify({ error: 'Invalid files format' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Initialize the Gemini client
    const ai = new GoogleGenerativeAI(apiKey);

    // Get the specific generative model
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    // 4. Prepare the content for the API call

    // Construct the user's current turn, potentially including text and multiple files
    const userParts: Part[] = [];

    // Add file parts if they exist
    if (files.length > 0) {
      console.log(`Backend: Processing ${files.length} files.`);
      files.forEach((file) => {
        // Basic check for base64 format (optional but good practice)
        if (!/^[A-Za-z0-9+/=]+$/.test(file.data)) {
          console.warn(`Backend: File data for mimeType ${file.mimeType} doesn\'t look like base64, proceeding anyway.`);
        }
        userParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        }); // Removed the unnecessary type assertion
      });
    }

    // Add text part if it exists
    if (userMessage.trim().length > 0) {
      console.log(`Backend: Adding user text message.`);
      userParts.push({ text: userMessage });
    }

    // Combine history with the new user message (which might have multiple parts)
    const contents: Content[] = [
      ...history,
      { role: 'user', parts: userParts } // Use the combined parts array
    ];

    // 5. Create a streaming response using Web Streams API
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // 6. Execute streaming in the background
    (async () => {
      try {
        console.log("Backend: Calling generateContentStream with history and potentially files..."); // Log before call
        const result = await model.generateContentStream({ 
          contents: contents,
        });
        console.log("Backend: generateContentStream call completed."); // Log after call

        console.log("Backend: Starting to process stream...");
        let chunkIndex = 0;
        for await (const chunk of result.stream) { 
          console.log(`Backend: Processing chunk index: ${chunkIndex}`); // Log chunk index
          let text: string | undefined;
          try {
            text = chunk.text(); 
          } catch (e) {
            console.error(`Backend: Error accessing chunk.text() function[${chunkIndex}]:`, e);
          }
          console.log(`Backend: Chunk[${chunkIndex}] text:`, text);
          if (text) {
            console.log(`Backend: Writing chunk[${chunkIndex}] to output stream.`);
            await writer.write(encoder.encode(text));
          } else {
            console.log(`Backend: Chunk[${chunkIndex}] has no text or text could not be extracted.`);
          }
          chunkIndex++;
        }

        console.log(`Backend: Finished processing stream. Total chunks: ${chunkIndex}`);
        writer.close();
      } catch (error) {
        console.error("Backend Streaming error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
        try {
          if (writer) {
            await writer.write(encoder.encode(`[ERROR] ${errorMessage}`));
          }
        } catch (writeError) {
          console.error("Backend: Error writing error message to stream:", writeError);
        } finally {
          try {
            if (writer) {
                await writer.close();
            }
          } catch (closeError) {
            console.error("Backend: Error closing writer after error:", closeError);
          }
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error in /api/chat:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat message', 
      details: errorMessage 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 