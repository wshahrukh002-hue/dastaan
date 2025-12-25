import { GoogleGenAI, Modality, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { GenerationSettings, NarratorTone } from "../types";
import lamejs from "lamejs";

const MAX_CHARS = 800; // Lowered for better stability in preview
const RETRY_ATTEMPTS = 3; // Increased retries for rate limit handling
const BASE_RETRY_DELAY_MS = 2000;

export const decodeBase64 = (base64: string) => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed", e);
    throw new Error("Failed to decode audio data.");
  }
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

/**
 * Encodes raw PCM data into an MP3 Blob using lamejs.
 */
export const createMp3Blob = (pcmData: Uint8Array, sampleRate: number = 24000, kbps: number = 128): Blob => {
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const samples = new Int16Array(pcmData.buffer);
  const mp3Data = [];
  
  const sampleBlockSize = 1152; 
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  const finalBuf = mp3encoder.flush();
  if (finalBuf.length > 0) {
    mp3Data.push(finalBuf);
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
};

export class GeminiSpeechService {
  private getGeminiVoiceName(voiceId: string): string {
    const mapping: Record<string, string> = {
      zephyr: 'Zephyr',
      ayaan: 'Kore',
      hamna: 'Puck',
      noor: 'Charon'
    };
    return mapping[voiceId] || 'Zephyr';
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateUrduSpeech(text: string, settings: GenerationSettings): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing.");
    }

    const sanitizedText = text.replace(/\n+/g, ' ').trim();
    if (!sanitizedText) {
      throw new Error("Text is empty.");
    }

    if (sanitizedText.length > MAX_CHARS) {
      throw new Error(`Text is too long (${sanitizedText.length} chars). Max allowed for high-quality preview is ${MAX_CHARS} characters.`);
    }

    const toneStyle = this.getStyleFromTone(settings.tone);
    const apiVoiceName = this.getGeminiVoiceName(settings.voice);

    const callApi = async (attempt: number): Promise<string> => {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: sanitizedText }] }],
          config: {
            systemInstruction: `Narration Task: Read the provided Urdu text. 
Tone: ${toneStyle}. 
Voice: ${apiVoiceName}. 
Output: Audio ONLY. No introductory remarks.`,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: apiVoiceName },
              },
            },
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate || candidate.finishReason === 'OTHER' || candidate.finishReason === 'RECITATION') {
          throw new Error(`Finish Reason: ${candidate?.finishReason || 'Unknown'}`);
        }

        const part = candidate.content?.parts?.find(p => p.inlineData);
        const base64Audio = part?.inlineData?.data;

        if (!base64Audio) {
          throw new Error("Empty audio response.");
        }

        return base64Audio;
      } catch (error: any) {
        const errorMsg = error.message || "";
        const isTransient = errorMsg.includes('500') || 
                          errorMsg.includes('INTERNAL') || 
                          errorMsg.includes('OTHER');
        const isRateLimit = errorMsg.includes('429') || 
                           errorMsg.includes('RESOURCE_EXHAUSTED') || 
                           errorMsg.includes('quota');
        
        if ((isTransient || isRateLimit) && attempt < RETRY_ATTEMPTS) {
          // Use exponential backoff for rate limits
          const delay = isRateLimit