# Conversation Handler Edge Function

This Edge Function processes spoken language for the Shira language learning app. It handles speech recognition, pronunciation evaluation, and continuing conversations between the user and an AI assistant.

## Features

- Receives audio recordings from the app and transcribes them using Google Speech-to-Text
- Compares the transcription against an expected phrase for accuracy
- Evaluates pronunciation quality using word confidence scores
- Provides AI-generated phonetic pronunciation guides for all mispronounced words using Google Gemini
- Generates natural conversation continuations with Google Gemini

## Prerequisites

- Supabase project with Edge Functions enabled
- Google Cloud Platform account with both Speech-to-Text and Generative AI APIs enabled
- A single Google API key with access to both Speech-to-Text and Gemini services

## Deployment Steps

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Set up the required environment variable:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-google-api-key
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy conversation-handler --no-verify-jwt
   ```

   For production, you should implement proper authentication:
   ```bash
   supabase functions deploy conversation-handler
   ```

## API Reference

### Request Format

```typescript
{
  "audioContent": string, // Base64 encoded audio (LINEAR16 format, 16kHz sample rate, mono)
  "expectedPhrase": string, // The phrase the user is supposed to say
  "conversationHistory": [ // Optional previous conversation messages
    {
      "text": string,
      "translation": string, // Optional
      "isUser": boolean
    }
  ]
}
```

### Response Format

```typescript
{
  "transcript": string, // The transcribed speech
  "words": [ // Individual word confidences
    {
      "word": string,
      "confidence": number
    }
  ],
  "evaluation": {
    "rating": string, // "Great Job! You have mastered the phrase." or "Needs Work"
    "explanation": string // Feedback for the user
  },
  // Only included if evaluation is successful:
  "nextPrompt": string, // Next sentence for the system to say
  "nextPromptTranslation": string, // English translation
  "responsePrompt": string, // Expected response from the user
  "responsePromptTranslation": string // English translation
}
```

## Usage from Client

```typescript
const audio = await recordAudio(); // Your app's recording function
const base64Audio = await convertToBase64(audio); // Convert to base64

const { data, error } = await supabase.functions.invoke('conversation-handler', {
  body: {
    audioContent: base64Audio,
    expectedPhrase: "¿Cómo estás hoy?",
    conversationHistory: [
      {
        text: "Hola, ¿cómo estás?",
        translation: "Hello, how are you?",
        isUser: false
      }
    ]
  }
});

if (error) {
  console.error('Error processing speech:', error);
} else {
  // Handle the response based on evaluation
  if (data.evaluation.rating.includes("Great Job")) {
    // User pronounced the phrase correctly
    // Show the next part of the conversation
    showConversation(data.nextPrompt, data.responsePrompt);
  } else {
    // User needs to improve pronunciation
    showFeedback(data.evaluation.explanation);
  }
}
```

## Error Handling

The function returns specific error codes for different situations:

- `400`: Missing required parameters or no transcription results
- `500`: Internal server error or API errors

## Extending the Function

### Adding More Languages

To support additional languages, modify the `languageCode` parameter in the `transcribeSpeech` function to the appropriate language code (e.g., "fr-FR" for French).

### Customizing Evaluation Criteria

Adjust the `similarityThreshold` and `confidenceThreshold` variables to change how strict the pronunciation evaluation is.

### Customizing Pronunciation Guides

The function now uses Google Gemini exclusively for generating all phonetic pronunciation guides. You can customize the prompt in the `getPhoneticHint` function to change how the guides are formatted.

## Troubleshooting

- **"No transcription results" error**: This usually means the audio wasn't clear enough or there was no speech detected. Try speaking louder or closer to the microphone.
- **Model generation errors**: If you're getting strange or missing responses from Gemini, check your prompt formatting and API key validity.
- **Deployment issues**: Make sure your Supabase CLI is up to date and you've properly linked your project. 