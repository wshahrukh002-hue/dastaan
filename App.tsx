
import React, { useState, useRef, useEffect } from 'react';
import { GeminiSpeechService, decodeBase64, decodeAudioData, createWavBlob } from './services/geminiService';
import { GenerationSettings, VoiceName, NarratorTone, Story, SavedProject } from './types';
import { SAMPLE_STORIES, Icons } from './constants';
import NarratorControls from './components/NarratorControls';
import AudioVisualizer from './components/AudioVisualizer';

// Define the platform-provided AIStudio interface
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fixed: Made aistudio optional to match existing environment declarations and avoid "identical modifiers" error
    aistudio?: AIStudio;
  }
}

const STORAGE_KEY_PROJECTS = 'dastaan_saved_projects';
const STORAGE_KEY_DRAFT = 'dastaan_editor_draft';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState<boolean>(false);
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(false);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'presets' | 'saved'>('presets');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);
  
  const [settings, setSettings] = useState<GenerationSettings>({
    voice: VoiceName.Zephyr,
    tone: NarratorTone.Calm,
    backgroundMusic: '',
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const service = useRef(new GeminiSpeechService());

  // Load initial data
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      }
    };
    checkKey();

    // Load saved projects
    const stored = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (stored) {
      try {
        setSavedProjects(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved projects", e);
      }
    }

    // Load draft
    const draft = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setText(parsed.text || '');
        if (parsed.settings) setSettings(parsed.settings);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({ text, settings }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [text, settings]);

  const saveProject = () => {
    if (!text.trim()) return;
    
    // Generate a title from the first few words or line
    const firstLine = text.split('\n')[0].trim().substring(0, 30);
    const title = firstLine || `Untitled Project ${new Date().toLocaleDateString()}`;
    
    const newProject: SavedProject = {
      id: crypto.randomUUID(),
      title,
      content: text,
      settings: { ...settings },
      timestamp: Date.now(),
    };

    const updated = [newProject, ...savedProjects];
    setSavedProjects(updated);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
    
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
  };

  const loadProject = (project: SavedProject) => {
    setText(project.content);
    setSettings(project.settings);
    setErrorMsg(null);
    setIsQuotaError(false);
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
    }
    if (bgMusicRef.current) bgMusicRef.current.pause();
    setIsPlaying(false);
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasCustomKey(true);
        setErrorMsg(null);
        setIsQuotaError(false);
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    }
  };

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) {
      setErrorMsg("Please enter some Urdu text or select a story from the library.");
      return;
    }

    stopPlayback();
    setIsGenerating(true);
    setErrorMsg(null);
    setIsQuotaError(false);
    setLastAudioBlob(null);

    try {
      const base64Audio = await service.current.generateUrduSpeech(text, settings);
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current!, 24000, 1);
      const wavBlob = createWavBlob(audioBytes, 24000);
      setLastAudioBlob(wavBlob);

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
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);
      source.onended = () => {
        setIsPlaying(false);
        if (bgMusicRef.current) bgMusicRef.current.pause();
      };
      source.start();
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (error: any) {
      const msg = error.message || String(error);
      const isQuota = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
      const isConfigError = msg.includes("Requested entity was not found");

      if (isQuota || isConfigError) {
        setIsQuotaError(true);
        setHasCustomKey(false);
        setErrorMsg(isQuota 
          ? "Narration limit reached. To continue crafting high-quality Urdu stories, please switch to your own personal API key." 
          : "Your API key configuration is invalid. Please reconnect or check your Google Cloud project settings.");
      } else {
        setErrorMsg("Failed to generate narration. Please try a shorter text or a different voice.");
      }
      console.error("TTS Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!lastAudioBlob) return;
    const url = URL.createObjectURL(lastAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dastaan-Urdu-${new Date().getTime()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col items-center">
      {/* Save Notification */}
      {showSaveToast && (
        <div className="fixed top-8 right-8 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-sm tracking-wide">Project Saved to Library</span>
        </div>
      )}

      <header className="max-w-4xl w-full mb-8 text-center flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Icons.Magic />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Dastaan</h1>
        </div>
        <p className="text-slate-400 text-lg mb-6 urdu-font" dir="rtl">اردو زبان کا جدید ترین اور حقیقت پسندانہ اے آئی راوی</p>
        
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs shadow-xl backdrop-blur-sm">
          <div className={`w-2.5 h-2.5 rounded-full ${hasCustomKey ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
          <span className="text-slate-300 font-semibold tracking-wide uppercase">
            {hasCustomKey ? 'Premium Account Mode' : 'Shared Narrative Quota'}
          </span>
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          <button 
            onClick={handleSelectApiKey}
            className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all border border-indigo-500/20 text-[10px] font-bold tracking-tighter"
          >
            {hasCustomKey ? 'SWITCH KEY' : 'UNLOCK FULL ACCESS'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden border-slate-800/50">
            {errorMsg && (
              <div className={`mb-6 p-5 border rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${isQuotaError ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' : 'bg-rose-500/10 border-rose-500/30 text-rose-100'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${isQuotaError ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1 text-base">{isQuotaError ? 'Resource Exhausted' : 'Narration Error'}</h3>
                    <p className="text-sm opacity-90 leading-relaxed">{errorMsg}</p>
                    {isQuotaError && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={handleSelectApiKey}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-950/50"
                        >
                          CONNECT PERSONAL API KEY
                        </button>
                        <a 
                          href="https://ai.google.dev/gemini-api/docs/billing" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                        >
                          Setup Billing
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                Script Editor
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20 tracking-widest uppercase font-black">Persistent Draft</span>
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={saveProject}
                  disabled={!text.trim()}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 hover:border-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                  SAVE PROJECT
                </button>
                <div className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded-md border border-slate-800">CHARS: {text.length}</div>
              </div>
            </div>

            <textarea
              dir="rtl"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اپنی کہانی یہاں لکھیں... (Your story persists as you type...)"
              className="urdu-font w-full h-[400px] bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-2xl text-slate-100 placeholder-slate-700 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none shadow-inner"
            />

            <div className="mt-8 flex flex-col gap-8">
              <NarratorControls settings={settings} onChange={setSettings} />

              <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-800/50">
                <button
                  onClick={isPlaying ? stopPlayback : handleGenerateAndPlay}
                  disabled={isGenerating}
                  className={`flex-1 min-w-[260px] flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-2xl ${
                    isPlaying 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                      GENERATING...
                    </>
                  ) : isPlaying ? (
                    <><Icons.Stop /> STOP NARRATION</>
                  ) : (
                    <><Icons.Play /> START NARRATION</>
                  )}
                </button>
                
                <button 
                  className={`p-5 rounded-2xl transition-all border shadow-lg ${
                    lastAudioBlob 
                    ? 'bg-slate-800 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-400' 
                    : 'bg-slate-900/50 text-slate-700 border-slate-800 cursor-not-allowed opacity-40'
                  }`}
                  onClick={handleDownload}
                  disabled={!lastAudioBlob}
                  title="Download Recording (WAV)"
                >
                  <Icons.Download />
                </button>
              </div>

              {isPlaying && (
                <div className="mt-4 py-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl px-6 flex flex-col gap-4">
                  <AudioVisualizer isPlaying={isPlaying} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 h-full flex flex-col border-slate-800/50 shadow-2xl min-h-[700px]">
            {/* Sidebar Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800 mb-6">
              <button 
                onClick={() => setSidebarTab('presets')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${sidebarTab === 'presets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Story presets
              </button>
              <button 
                onClick={() => setSidebarTab('saved')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${sidebarTab === 'saved' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                My Library
                {savedProjects.length > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px]">{savedProjects.length}</span>}
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar flex-1">
              {sidebarTab === 'presets' ? (
                SAMPLE_STORIES.map(story => (
                  <button
                    key={story.id}
                    onClick={() => { setText(story.content); setErrorMsg(null); setIsQuotaError(false); }}
                    className="text-right flex flex-col gap-3 p-5 bg-slate-900/20 hover:bg-slate-800/80 border border-slate-800/40 hover:border-indigo-500/40 rounded-2xl transition-all group active:scale-[0.97]"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:bg-white animate-pulse" />
                      </div>
                      <h3 className="urdu-font text-xl text-white font-bold leading-none">{story.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 text-left leading-relaxed font-medium group-hover:text-slate-400 transition-colors">{story.description}</p>
                  </button>
                ))
              ) : (
                savedProjects.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="p-4 bg-slate-800 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest mb-2">Library is empty</p>
                    <p className="text-xs">Your saved scripts will appear here for quick access later.</p>
                  </div>
                ) : (
                  savedProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => loadProject(project)}
                      className="text-right flex flex-col gap-3 p-5 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/40 hover:border-indigo-500/40 rounded-2xl transition-all group cursor-pointer active:scale-[0.97] relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <button 
                          onClick={(e) => deleteProject(project.id, e)}
                          className="p-2 text-slate-600 hover:text-rose-500 transition-colors z-10"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 6m-4.74 0 .34-6m4.74-6-.34 6.63m1.38-5.23L14.5 3h-5l-.31 1.17M19 10l-.84 12.45A2.25 2.25 0 0 1 15.91 21L5 21a2.25 2.25 0 0 1-2.25-2.25L1.91 10M19 10l-1.09-1.38M1 10h18M1 10h18" />
                          </svg>
                        </button>
                        <h3 className="urdu-font text-lg text-white font-bold leading-none truncate max-w-[180px]">{project.title}</h3>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                          {project.settings.voice}
                        </span>
                        <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
            
            <div className="mt-auto pt-8">
              <div className="p-5 bg-indigo-600/5 rounded-2xl border border-indigo-500/10">
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Persisted data is stored locally in your browser and is not uploaded to our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-12 mb-8 text-center text-slate-700 text-[10px] uppercase tracking-[0.4em] font-black">
        DASTAAN • IMMERSIVE URDU NARRATION ENGINE
      </footer>
    </div>
  );
};

export default App;
