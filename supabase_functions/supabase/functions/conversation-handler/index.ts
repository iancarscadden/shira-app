import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.0';

// Define the expected request format
interface RequestBody {
  audioContent: string; // Base64 encoded audio
  expectedPhrase: string; // Phrase the user is supposed to say
  conversationHistory?: Message[]; // Optional conversation history for continuing conversations
}

// Define the message format for conversation history
interface Message {
  text: string;
  translation?: string;
  isUser: boolean;
}

// Define the word confidence structure
interface WordConfidence {
  word: string;
  confidence: number;
}

// Define the response structure from the speech-to-text API
interface SpeechRecognitionResult {
  alternatives: {
    transcript: string;
    confidence: number;
    words?: {
      word: string;
      confidence: number;
      startTime?: string;
      endTime?: string;
    }[];
  }[];
}

// Define our expected response structure
interface ResponseData {
  transcript: string;
  words: WordConfidence[];
  evaluation: {
    rating: string;
    explanation: string;
  };
  nextPrompt?: string;
  nextPromptTranslation?: string;
  responsePrompt?: string;
  responsePromptTranslation?: string;
}

// Add a utility function for handling raw audio encoding
async function processAudioForSpeechToText(audioContent: string): Promise<string> {
  try {
    console.log("Processing raw audio data...");
    console.log("Audio content length:", audioContent.length);
    
    // Check if the data seems to be corrupted or empty
    if (!audioContent || audioContent.length < 1000) {
      throw new Error("Audio data is too short or empty");
    }
    
    // For now, we're using the audio as-is, but this is where we would add 
    // format conversion if needed in the future
    
    return audioContent;
  } catch (error) {
    console.error("Error processing audio:", error);
    throw error;
  }
}

// Improve the transcribeSpeech function with better audio format handling
async function transcribeSpeech(audioContent: string): Promise<SpeechRecognitionResult[]> {
  try {
    // Use the same API key as Gemini since both are Google APIs
    const apiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCjwlSSs6nVZ0QMK7iyJZEgKONFtq5xJsw';
    
    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
    
    // Process the audio data to ensure it's in the correct format
    const processedAudio = await processAudioForSpeechToText(audioContent);
    
    // Enhanced request body with robust audio configuration
    const requestBody = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "es-ES",
        enableWordConfidence: true,
        model: "default", // Using the default model for short phrases
        audioChannelCount: 1,
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        // Add additional settings to help with processing
        metadata: {
          interactionType: "DICTATION",
          microphoneDistance: "NEARFIELD",
          recordingDeviceType: "SMARTPHONE",
        },
      },
      audio: { content: processedAudio }
    };

    console.log("Sending request to Google Speech-to-Text API with config:", JSON.stringify({
      ...requestBody.config,
      // Don't log the actual audio content to avoid massive logs
      audio: { contentLength: processedAudio.length }
    }));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log("Raw Speech API response length:", responseText.length);
    console.log("Response status:", response.status);
    
    if (responseText.length < 500) {
      // If response is small enough, log it completely
      console.log("Response content:", responseText);
    } else {
      // Otherwise just log a preview
      console.log("Response preview:", responseText.substring(0, 500) + "...");
    }
    
    if (!response.ok) {
      console.error(`Speech API Error: ${response.status} - ${responseText}`);
      throw new Error(`Speech API Error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    if (!data.results || data.results.length === 0) {
      console.error("No transcription results returned from Speech API");
      throw new Error("No speech detected in the audio. Please try speaking louder and clearer.");
    }
    
    // Log the transcription results for debugging
    console.log("Transcription results:", JSON.stringify(data.results, null, 2));
    
    return data.results;
  } catch (error) {
    console.error("Error in transcribeSpeech:", error);
    throw error;
  }
}

// Enhance the generateConversationContinuation function to include conversation history
async function generateConversationContinuation(
  systemPrompt: string, 
  userResponse: string,
  conversationHistory: Message[] = []
): Promise<{ 
  nextPrompt: string; 
  nextPromptTranslation: string;
  responsePrompt: string;
  responsePromptTranslation: string;
}> {
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCjwlSSs6nVZ0QMK7iyJZEgKONFtq5xJsw';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Format conversation history to help the model understand context
    let historyText = "";
    if (conversationHistory.length > 0) {
      historyText = "Previous conversation:\n";
      conversationHistory.forEach(msg => {
        historyText += `${msg.isUser ? "User" : "System"}: ${msg.text}\n`;
      });
      historyText += "\n";
    }

    const prompt = `
    You are inside of a Spanish conversation feature inside of a language learning app.
    
    ${historyText}
    We prompted our user to respond to this phrase: ${systemPrompt}
    This is what they responded with: ${userResponse}

    I want you to return:
    1. A new sentence / response to what the user responded with that follows the flow 
       of the conversation. This will be displayed to the user as the system's next message.
       Also provide an English translation.

    2. A COMPLETE sentence for the user to say in response to your system message.
       This must be a FULLY-FORMED Spanish sentence that the user will practice speaking.
       This cannot be a template, a fill-in-the-blank, or an incomplete phrase.
       Also provide an English translation.

    Rules: 
    - The new sentence / response should be between 5-10 words.
    - ALL phrases must be COMPLETE sentences, not partial phrases with "..."
    - The responsePrompt MUST be a complete sentence a language learner can practice, not a prompt or template.
    - Return the results in JSON format with the following structure:
      {
        "nextPrompt": "Spanish sentence for system to say",
        "nextPromptTranslation": "English translation of nextPrompt",
        "responsePrompt": "COMPLETE Spanish sentence for user to say next",
        "responsePromptTranslation": "English translation of responsePrompt"
      }
    - Keep responses appropriate for language learning.
    - Use vocabulary and grammar suitable for an intermediate learner.
    
    Examples of GOOD response format:
    {
      "nextPrompt": "¿Qué hiciste el fin de semana?",
      "nextPromptTranslation": "What did you do on the weekend?",
      "responsePrompt": "Fui al cine con mis amigos.",
      "responsePromptTranslation": "I went to the movies with my friends."
    }
    
    Examples of BAD response format (do not do this):
    {
      "nextPrompt": "¿Qué hiciste ayer?",
      "nextPromptTranslation": "What did you do yesterday?",
      "responsePrompt": "Ayer, yo... (Yesterday, I...)",
      "responsePromptTranslation": "Yesterday, I... (your turn)"
    }
    
    The example above is BAD because "Ayer, yo..." is not a complete sentence.
    `;

    console.log("Generating conversation continuation with Gemini");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from response text (needed because sometimes the model wraps the JSON in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse JSON from model response:", text);
      throw new Error("Failed to parse JSON from model response");
    }
    
    const jsonStr = jsonMatch[0];
    const parsedResponse = JSON.parse(jsonStr);
    
    // Validate the response format
    const requiredFields = ['nextPrompt', 'nextPromptTranslation', 'responsePrompt', 'responsePromptTranslation'];
    for (const field of requiredFields) {
      if (!parsedResponse[field]) {
        console.error(`Missing field ${field} in response:`, parsedResponse);
        throw new Error(`Generated conversation is missing ${field}`);
      }
    }
    
    // Additional validation to check for incomplete phrases
    if (parsedResponse.responsePrompt.includes('...')) {
      console.error("Incomplete response prompt detected:", parsedResponse.responsePrompt);
      throw new Error("Generated response prompt is incomplete. Retry with a complete sentence.");
    }
    
    return {
      nextPrompt: parsedResponse.nextPrompt,
      nextPromptTranslation: parsedResponse.nextPromptTranslation,
      responsePrompt: parsedResponse.responsePrompt,
      responsePromptTranslation: parsedResponse.responsePromptTranslation
    };
  } catch (error) {
    console.error("Error generating conversation:", error);
    throw new Error(`Failed to generate conversation: ${error.message}`);
  }
}

// Calculate the similarity between two strings (simple version for phrase matching)
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1.0;
  
  // Count matching words for a simple similarity score
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matches = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matches++;
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

// Remove the commonPhoneticGuides object and replace the getPhoneticHint function
async function getPhoneticHint(word: string): Promise<string> {
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCjwlSSs6nVZ0QMK7iyJZEgKONFtq5xJsw';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `
      Give me a simple phonetic pronunciation guide for this Spanish word: "${word}".
      
      Rules:
      1. Use simple English-based phonetics that a beginner English speaker can understand.
      2. Break it down by syllables with hyphens between them.
      3. Use emphasis where needed.
      4. Don't explain anything, just provide the pronunciation guide.
      5. Return ONLY the phonetic guide, nothing else.
      
      For example:
      - "hola" should be "oh-lah"
      - "gracias" should be "grah-see-ahs"
      - "buenos días" should be "bweh-nohs dee-ahs"
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Clean up and return only the phonetic guide, removing any quotes or explanations
    const cleanedText = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    return cleanedText || word; // Fallback to the original word if no valid result
  } catch (error) {
    console.error(`Error generating phonetic hint for '${word}':`, error);
    // Fallback to original word if Gemini fails
    return word;
  }
}

// Update the main serve function to use conversation history when available
serve(async (req) => {
  try {
    // Parse the request
    const requestData: RequestBody = await req.json();
    const { audioContent, expectedPhrase, conversationHistory = [] } = requestData;
    
    console.log("Processing request", { 
      hasAudio: !!audioContent, 
      expectedPhrase, 
      historyLength: conversationHistory.length 
    });
    
    if (!audioContent) {
      return new Response(
        JSON.stringify({ error: 'Missing audio content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!expectedPhrase) {
      return new Response(
        JSON.stringify({ error: 'Missing expected phrase' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Process the audio with Google Speech-to-Text API
    const results = await transcribeSpeech(audioContent);
    
    // Process transcription results
    const bestAlternative = results[0].alternatives[0];
    const transcript = bestAlternative.transcript;
    console.log("Transcription result:", transcript);
    
    // Extract word confidence scores
    const words: WordConfidence[] = [];
    if (bestAlternative.words) {
      bestAlternative.words.forEach(wordInfo => {
        words.push({
          word: wordInfo.word || "",
          confidence: wordInfo.confidence || 0
        });
      });
    }
    
    // Check if transcript is similar enough to expected phrase
    const similarityThreshold = 0.7; // 70% similarity required
    const similarity = calculateSimilarity(transcript, expectedPhrase);
    console.log(`Similarity score: ${similarity} (threshold: ${similarityThreshold})`);
    
    // Begin building the response
    const responseData: ResponseData = {
      transcript,
      words,
      evaluation: {
        rating: "",
        explanation: ""
      }
    };
    
    // Check phrase similarity
    if (similarity < similarityThreshold) {
      responseData.evaluation = {
        rating: "Needs Work",
        explanation: `Your response doesn't match what we expected. Please try again with: "${expectedPhrase}"`
      };
      
      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check word confidence scores
    const confidenceThreshold = 0.7; // 70% confidence required
    const lowConfidenceWords = words.filter(word => word.confidence < confidenceThreshold);
    
    if (lowConfidenceWords.length > 0) {
      console.log("Words with low confidence:", lowConfidenceWords);
      
      // Process all phonetic hints in parallel
      const phoneticHints = await Promise.all(
        lowConfidenceWords.map(async (word) => {
          const phonetic = await getPhoneticHint(word.word);
          return { word: word.word, phonetic };
        })
      );
      
      // Format the message in a more user-friendly way with bullet points
      let explanation = "Close! Say";
      
      if (phoneticHints.length === 1) {
        explanation += `\n• "${phoneticHints[0].word}" like "${phoneticHints[0].phonetic}"`;
      } else {
        // Multiple words need work - use bullet points for each word
        phoneticHints.forEach(hint => {
          explanation += `\n• "${hint.word}" like "${hint.phonetic}"`;
        });
      }
      
      responseData.evaluation = {
        rating: "Needs Work",
        explanation: explanation
      };
      
      // Include expected phrase for the client to redisplay
      responseData.nextPrompt = expectedPhrase;
      
      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // If we got this far, the user said the phrase correctly with good pronunciation
    // Generate the next part of the conversation using history if available
    console.log("Generating next conversation steps");
    const continuation = await generateConversationContinuation(
      expectedPhrase, 
      transcript,
      conversationHistory
    );
    
    // Add conversation continuation to response
    responseData.evaluation = {
      rating: "Well done!",
      explanation: "Your pronunciation was good!"
    };
    
    responseData.nextPrompt = continuation.nextPrompt;
    responseData.nextPromptTranslation = continuation.nextPromptTranslation;
    responseData.responsePrompt = continuation.responsePrompt;
    responseData.responsePromptTranslation = continuation.responsePromptTranslation;
    
    console.log("Response ready with continuation");
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Send specific error messages to the client
    if (errorMessage.includes('No speech detected')) {
      return new Response(
        JSON.stringify({ error: 'No transcription results' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        details: errorMessage 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 