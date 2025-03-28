import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Hardcoded API key as requested
const ELEVENLABS_API_KEY = "sk_c32243f922c9200ee5d90b2e29687298733ff0aea4546444";
const DEFAULT_VOICE_ID = "Nh2zY9kknu6z4pZy6FhD";

serve(async (req) => {
  // Enhanced CORS headers with streaming support
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, xi-api-key, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Type, Accept-Ranges, Content-Range, Transfer-Encoding",
    "Access-Control-Max-Age": "86400",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const text = url.searchParams.get("text");
    const voiceId = url.searchParams.get("voice_id") || DEFAULT_VOICE_ID;
    const optimize_streaming_latency = url.searchParams.get("optimize_streaming_latency") || "true";

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text parameter" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log(`Processing streaming TTS request for: "${text}" with voice: ${voiceId}`);

    // Use streaming endpoint from ElevenLabs
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    
    // Create request body with optimized settings for low latency
    const requestBody = {
      text: text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      // Use lower quality mp3 for faster initial playback
      output_format: "mp3_44100_64",
      optimize_streaming_latency: optimize_streaming_latency === "true" ? 1 : 0,
    };

    console.log("Sending optimized streaming request to ElevenLabs API...");
    
    // Make the request to ElevenLabs streaming API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Get the response body as a ReadableStream
    const stream = response.body;
    if (!stream) {
      throw new Error("No stream returned from ElevenLabs");
    }

    console.log("Successfully streaming audio from ElevenLabs");
    
    // Return the stream directly with optimized streaming headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Transfer-Encoding": "chunked",
        // Add buffer hint for browsers to start playing with minimal buffering
        "X-Accel-Buffering": "no",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in TTS streaming function:", error.message);
    return new Response(JSON.stringify({ 
      error: "Server error", 
      message: error.message 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
}); 