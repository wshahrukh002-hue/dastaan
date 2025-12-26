
import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationSettings } from "../types";

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
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

export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

export class GeminiSpeechService {
  async generateUrduSpeech(text: string, settings: GenerationSettings): Promise<string> {
    // ALWAYS create a fresh instance right before making an API call 
    // to ensure it uses the most up-to-date API key from the environment/dialog.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Speak the following Urdu text clearly as a ${settings.tone} narrator. Output only the audio: ${text}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: settings.voice },
            },
          },
        },
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("Empty response from AI.");
      }

      const candidate = response.candidates[0];
      
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Generation interrupted: ${candidate.finishReason}`);
      }

      let base64Audio = '';
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Audio = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Audio) {
        throw new Error("Speech data not found in response parts.");
      }

      return base64Audio;
    } catch (error: any) {
      // Re-throw raw error message for App.tsx to parse and detect status codes
      throw error;
    }
  }
}
