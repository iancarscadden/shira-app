import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { SpeechClient, protos } from "@google-cloud/speech";
import OpenAI from "openai";

// Initialize clients
const speechClient = new SpeechClient();
const openai = new OpenAI({
    apiKey: "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"
});

const ASSISTANT_ID = 'asst_G04oUdxuiMxaiV13YlfEdbNj';

interface WordConfidence {
    word: string;
    confidence: number;
}

interface AssistantMessage {
    text: {
        value: string;
    };
}

/**
 * Cloud Function: transcribeAndEvaluate
 *
 * Expects a POST request with a JSON body:
 * {
 *   "audioContent": "<base64-encoded-audio-string>",
 *   "expectedPhrase": "<expected phrase string>" // optional; defaults if not provided.
 * }
 *
 * Steps:
 * 1. Validate the request.
 * 2. Transcribe the audio using Google Cloud Speech-to-Text.
 * 3. Evaluate the transcription using the OpenAI API.
 *    The system prompt instructs the assistant to compare the transcription
 *    to the expected phrase and, based on word confidence scores, return exactly
 *    two lines: a one-word evaluation ("Great", "Needs Work", or "Bad")
 *    and a short explanation.
 * 4. Return a JSON response with the full transcript, word confidences, and evaluation.
 */
export const transcribeAndEvaluate = functions.https.onRequest(
    async (req: Request, res: Response): Promise<void> => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method Not Allowed. Use POST." });
            return;
        }

        const { audioContent, expectedPhrase } = req.body;
        if (!audioContent) {
            res.status(400).json({ error: 'Missing "audioContent" in request body.' });
            return;
        }

        const correctPhrase = expectedPhrase || "¿Y si nos metemos a nadar?";

        try {
            // Speech-to-text part remains the same
            const speechRequest: protos.google.cloud.speech.v1.IRecognizeRequest = {
                config: {
                    encoding: "LINEAR16" as const,
                    sampleRateHertz: 16000,
                    languageCode: "es-ES",
                    enableWordConfidence: true,
                },
                audio: { content: audioContent },
            };

            const [speechResponse] = await speechClient.recognize(speechRequest);
            
            if (!speechResponse.results || speechResponse.results.length === 0) {
                functions.logger.error("No transcription results returned from Speech API.");
                res.status(400).json({ error: "No transcription results." });
                return;
            }

            // Process transcription results
            let fullTranscript = "";
            const words: WordConfidence[] = [];
            
            for (const result of speechResponse.results) {
                if (result.alternatives && result.alternatives[0]) {
                    const alternative = result.alternatives[0];
                    fullTranscript += alternative.transcript + " ";
                    if (alternative.words) {
                        alternative.words.forEach((wordInfo) => {
                            words.push({
                                word: wordInfo.word || "",
                                confidence: wordInfo.confidence || 0,
                            });
                        });
                    }
                }
            }
            fullTranscript = fullTranscript.trim();

            // Create a thread and message for the assistant
            const thread = await openai.beta.threads.create();
            
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: `Evaluate this Spanish pronunciation:
                Expected phrase: "${correctPhrase}"
                User's transcript: "${fullTranscript}"
                Word confidences: ${JSON.stringify(words)}`
            });

            // Run the assistant
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: ASSISTANT_ID
            });

            // Poll for completion
            let evaluation: string | null = null;
            while (true) {
                const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                if (runStatus.status === 'completed') {
                    const messages = await openai.beta.threads.messages.list(thread.id);
                    evaluation = (messages.data[0].content[0] as AssistantMessage).text.value;
                    break;
                } else if (runStatus.status === 'failed') {
                    throw new Error('Assistant evaluation failed');
                }
                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (!evaluation) {
                throw new Error('No evaluation received from assistant');
            }

            // Parse assistant's response
            const lines = evaluation.split('\n').filter((line: string) => line.trim() !== '');
            const rating = lines[0].trim();
            const explanation = lines.slice(1).join(' ').trim();

            const responseData = {
                transcript: fullTranscript,
                words: words,
                evaluation: {
                    rating,
                    explanation
                },
            };

            functions.logger.info("Transcription and evaluation completed successfully.");
            res.status(200).json(responseData);

        } catch (err) {
            let errMsg = "Unknown error";
            if (err instanceof Error) {
                errMsg = err.message;
            }
            functions.logger.error("Error in transcribeAndEvaluate:", err);
            res.status(500).json({ error: "Internal Server Error", details: errMsg });
        }
    }
);
