import { NextRequest, NextResponse } from 'next/server';

// Define the expected request body structure from the frontend
interface ChatRequestBody {
  message: string;
}

// Define the response body structure for the frontend
interface ChatResponseBody {
  reply: string;
}

// Define the structure for the Gemini API request body
interface GeminiRequestBody {
  contents: {
    parts: { text: string }[];
  }[];
}

// Define (partially) the structure of the Gemini API response
// We only need the text from the first candidate's first part
interface GeminiResponseBody {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * POST handler for the /api/chat endpoint.
 * Receives a user message, forwards it to the Gemini API,
 * and returns the bot's reply.
 * 
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the bot's reply or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponseBody | { error: string; details?: string }>> {
  // 1. Get Gemini API Key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json(
      { 
        error: 'API key not configured', 
        details: 'The Gemini API key is missing on the server.' 
      },
      { status: 500 } // Internal Server Error
    );
  }

  try {
    // 2. Parse the incoming request body from the frontend
    const body: ChatRequestBody = await request.json();
    const userMessage = body.message;

    // Basic validation
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 }); // Bad Request
    }

    // 3. Construct the request body for the Gemini API
    const geminiRequestBody: GeminiRequestBody = {
      contents: [
        {
          parts: [{ text: userMessage }],
        },
      ],
    };

    // 4. Define the Gemini API endpoint URL (using gemini-1.5-flash model)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // 5. Make the POST request to the Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    // 6. Handle potential errors from the Gemini API
    if (!geminiResponse.ok) {
      const errorData: GeminiResponseBody = await geminiResponse.json();
      console.error("Gemini API Error:", geminiResponse.status, errorData);
      return NextResponse.json(
        { 
          error: 'Gemini API request failed', 
          details: errorData.error?.message || `Status code: ${geminiResponse.status}` 
        },
        { status: geminiResponse.status } // Propagate the status code
      );
    }

    // 7. Parse the successful Gemini API response
    const geminiData: GeminiResponseBody = await geminiResponse.json();

    // 8. Extract the reply text
    // Safely access the nested structure
    const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      console.error("Error: Could not extract reply text from Gemini response:", geminiData);
      return NextResponse.json(
        { 
          error: 'Failed to parse Gemini response', 
          details: 'The structure of the response was unexpected.'
        },
        { status: 500 } // Internal Server Error
      );
    }

    // 9. Return the bot's reply to the frontend
    return NextResponse.json({ reply: botReply });

  } catch (error) {
    // 10. Handle unexpected errors (e.g., network issues, JSON parsing errors)
    console.error("Error in /api/chat:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process chat message', details: errorMessage },
      { status: 500 } // Internal Server Error
    );
  }
} 