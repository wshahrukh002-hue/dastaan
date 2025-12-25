
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GeminiSpeechService, decodeBase64, decodeAudioData, createMp3Blob } from './services/geminiService';
import { GenerationSettings, VoiceId, NarratorTone, Story, Character } from './types';
import { SAMPLE_STORIES, Icons } from './constants';
import NarratorControls from './components/NarratorControls';
import AudioVisualizer from './components/AudioVisualizer';
import { voices } from './voices';

const MAX_CHUNK_SIZE = 700; // Safer chunk size for the preview model

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{current: number, total: number} | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentAudioBytes, setCurrentAudioBytes] = useState<Uint8Array | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    voice: voices[0]?.id || 'zephyr',
    tone: NarratorTone.Calm,
    backgroundMusic: '',
    audioQuality: 96,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Load characters from local storage
    const savedChars = localStorage.getItem('dastaan_characters');
    if (savedChars) {
      try {
        setCharacters(JSON.parse(savedChars));
      } catch (e) {
        console.error("Failed to load characters", e);
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const saveCharacters = (newChars: Character[]) => {
    setCharacters(newChars);
    localStorage.setItem('dastaan_characters', JSON.stringify(newChars));
  };

  const handleCreateCharacter = () => {
    const name = prompt("Enter a name for this Narrator Profile (e.g., 'Grandpa', 'Heroine'):");
    if (name) {
      const newChar: Character = {
        id: Date.now().toString(),
        name,
        voice: settings.voice,
        tone: settings.tone
      };
      const updatedChars = [...characters, newChar];
      saveCharacters(updatedChars);
      
      // Auto-select the newly created profile
      setSettings(prev => ({ 
        ...prev, 
        characterId: newChar.id 
      }));
    }
  };

  const handleCharacterSelect = (char: Character) => {
    setSettings(prev => ({
      ...prev,
      voice: char.voice,
      tone: char.tone,
      characterId: char.id
    }));
  };

  // Memoize active character for cleaner rendering logic
  const activeCharacter = useMemo(() => 
    characters.find(c => c.id === settings.characterId) || null
  , [characters, settings.characterId]);

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
    setIsPlaying(false);
  };

  const splitTextIntoChunks = (rawText: string): string[] => {
    // Split by common Urdu sentence enders: '۔' (full stop), '؟' (question), '!' (exclamation)
    const sentences = rawText.match(/[^۔؟!]+[۔؟!]+/g) || [rawText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_SIZE) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  };

  const mergeAudioBuffers = (buffers: AudioBuffer[]): AudioBuffer => {
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const mergedBuffer = audioContextRef.current!.createBuffer(
      1,
      totalLength,
      buffers[0].sampleRate
    );
    const channelData = mergedBuffer.getChannelData(0);
    let offset = 0;
    for (const buffer of buffers) {
      channelData.set(buffer.getChannelData(0), offset);
      offset += buffer.length;
    }
    return mergedBuffer;
  };

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) {
      alert("Please enter some Urdu text or select a story.");
      return;
    }

    stopPlayback();
    setIsGenerating(true);
    setCurrentAudioBytes(null);
    setGenerationProgress(null);

    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const chunks = splitTextIntoChunks(text);
      const service = new GeminiSpeechService();
      const audioBuffers: AudioBuffer[] = [];
      const allAudioBytes: Uint8Array[] = [];

      setGenerationProgress({ current: 0, total: chunks.length });

      for (let i = 0; i < chunks.length; i++) {
        setGenerationProgress({ current: i + 1, total: chunks.length });
        const base64Audio = await service.generateUrduSpeech(chunks[i], settings);
        const audioBytes = decodeBase64(base64Audio);
        allAudioBytes.push(audioBytes);
        
        const buffer = await decodeAudioData(
          audioBytes,
          audioContextRef.current!,
          24000,
          1
        );
        audioBuffers.push(buffer);
      }

      const totalByteLength = allAudioBytes.reduce((acc, bytes) => acc + bytes.length, 0);
      const mergedBytes = new Uint8Array(totalByteLength);
      let byteOffset = 0;
      for (const bytes of allAudioBytes) {
        mergedBytes.set(bytes, byteOffset);
        byteOffset += bytes.length;
      }
      setCurrentAudioBytes(mergedBytes);

      const finalBuffer = mergeAudioBuffers(audioBuffers);

      if (settings.backgroundMusic) {
        if (!bgMusicRef.current) {
          bgMusicRef.current = new Audio(settings.backgroundMusic);
          bgMusicRef.current.loop = true;
          bgMusicRef.current.volume = 0.15;
        } else if (bgMusicRef.current.src !== settings.backgroundMusic) {
          bgMusicRef.current.src = settings.backgroundMusic;
        }
        bgMusicRef.current.play();
      }

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = finalBuffer;
      source.connect(audioContextRef.current!.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        if (bgMusicRef.current) bgMusicRef.current.pause();
      };

      source.start();
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (error: any) {
      console.error("Speech generation failed:", error);
      alert(`Error: ${error.message || "Failed to generate speech."}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleDownload = () => {
    if (!currentAudioBytes) {
      alert("Please generate a narration first to download it.");
      return;
    }
    
    try {
      const mp3Blob = createMp3Blob(currentAudioBytes, 24000, settings.audioQuality);
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const charName = activeCharacter ? activeCharacter.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'narrator';
      
      const safeTone = settings.tone
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `dastaan-${charName}-${safeTone}-${settings.audioQuality}kbps-${timestamp}.mp3`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("MP3 Conversion failed:", error);
      alert("Failed to convert audio to MP3.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-4xl w-full mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Icons.Magic />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Dastaan</h1>
        </div>
        <p className="text-slate-400 text-lg">Consistent Narrator Character AI for Seamless Audiobooks</p>
      </header>

      <main className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                Story Manuscript
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Consistency Mode Active</span>
              </h2>
              <div className="text-xs text-slate-500">Characters: {text.length}</div>
            </div>

            <textarea
              dir="rtl"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اپنی کہانی یہاں لکھیں ( طویل کہانیوں کے لیے خودکار حصوں کی تخلیق فعال ہے )"
              className="urdu-font w-full h-[300px] bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-2xl text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />

            <div className="mt-6 flex flex-col gap-6">
              <NarratorControls 
                settings={settings} 
                characters={characters}
                activeCharacter={activeCharacter}
                onSettingsChange={setSettings} 
                onCharacterSelect={handleCharacterSelect}
                onCreateCharacter={handleCreateCharacter}
              />

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800">
                <button
                  onClick={isPlaying ? stopPlayback : handleGenerateAndPlay}
                  disabled={isGenerating}
                  className={`flex-1 min-w-[200px] flex flex-col items-center justify-center px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                    isPlaying 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGenerating ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                        <span>Generating...</span>
                      </div>
                      {generationProgress && (
                        <span className="text-[10px] mt-1 opacity-80 uppercase tracking-widest font-normal">
                          Part {generationProgress.current} of {generationProgress.total}
                        </span>
                      )}
                    </>
                  ) : isPlaying ? (
                    <div className="flex items-center gap-3">
                      <Icons.Stop />
                      <span>Stop Narrator</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Icons.Play />
                      <span>Generate Full Story</span>
                    </div>
                  )}
                </button>
                
                <button 
                  className={`p-4 rounded-xl transition-all border ${
                    currentAudioBytes 
                    ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700 cursor-pointer shadow-lg' 
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                  title="Download Seamless MP3"
                  onClick={handleDownload}
                  disabled={!currentAudioBytes}
                >
                  <Icons.Download />
                </button>
              </div>

              {isPlaying && (
                <div className="mt-2 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 flex items-center gap-4">
                  <div className="text-indigo-400 font-medium text-sm animate-pulse whitespace-nowrap">Now Narrating...</div>
                  <AudioVisualizer isPlaying={isPlaying} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-6">Inspiration Library</h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {SAMPLE_STORIES.map(story => (
                <button
                  key={story.id}
                  onClick={() => setText(story.content)}
                  className="text-right flex flex-col gap-2 p-4 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 rounded-2xl transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Load Text</span>
                    <h3 className="urdu-font text-lg text-white font-bold">{story.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 text-left">{story.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <h4 className="text-indigo-300 font-bold text-sm mb-1 flex items-center gap-2">
                  <Icons.Magic /> Consistency Feature
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Long texts are automatically split and narrated using fixed character profiles to ensure the narrator's voice doesn't change between paragraphs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-slate-500 text-sm pb-8 text-center">
        Dastaan • Gemini 2.5 Multi-Part Consistent Synthesis
      </footer>
    </div>
  );
};

export default App;
