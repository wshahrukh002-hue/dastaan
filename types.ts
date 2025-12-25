
export type VoiceId = string;

export enum NarratorTone {
  Bedtime = 'Soft Bedtime Voice (Calm & Soothing)',
  Dramatic = 'Deep & Dramatic (Cinematic)',
  Calm = 'Calm & Steady (Audiobook Style)',
  Reflective = 'Reflective & Philosophical',
  Emotional = 'Emotional & Touching Storytelling',
  Kids = 'Kids Friendly Tone (Energetic & Fun)',
}

export interface Character {
  id: string;
  name: string;
  voice: VoiceId;
  tone: NarratorTone;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  description: string;
}

export interface GenerationSettings {
  voice: VoiceId;
  tone: NarratorTone;
  backgroundMusic: string;
  audioQuality: number;
  characterId?: string;
}
