/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Grid, 
  HelpCircle, 
  Play, 
  Square, 
  Volume2, 
  RefreshCcw, 
  Sparkles,
  Layers,
  Activity,
  Trash,
  Keyboard,
  Download
} from 'lucide-react';
import { DrumPad, Sample, UserFile } from '../types';

interface DrumKitBuilderProps {
  drumPads: DrumPad[];
  catalogSamples: Sample[];
  userFiles: UserFile[];
  onTriggerPad: (pad: DrumPad) => void;
  onLoadSampleToPad: (padId: string, sampleId: string, type: 'catalog' | 'user') => void;
  onClearPad: (padId: string) => void;
  onLoadCustomKit: (kitName: string) => void;
  onDownloadCatalogSample: (sample: Sample) => void;
}

export default function DrumKitBuilder({
  drumPads,
  catalogSamples,
  userFiles,
  onTriggerPad,
  onLoadSampleToPad,
  onClearPad,
  onLoadCustomKit,
  onDownloadCatalogSample
}: DrumKitBuilderProps) {
  const [selectedPadId, setSelectedPadId] = useState<string>('pad-1');
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [activePressPadId, setActivePressPadId] = useState<string | null>(null);

  // Keyboard triggering listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard capture when editing inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }

      const key = e.key.toUpperCase();
      const targetPad = drumPads.find(p => p.keyBind === key);
      
      if (targetPad) {
        e.preventDefault();
        onTriggerPad(targetPad);
        setSelectedPadId(targetPad.id);
        setActivePressPadId(targetPad.id);
        
        // Short timeout to simulate glowing trigger flash
        setTimeout(() => {
          setActivePressPadId(null);
        }, 80);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drumPads, onTriggerPad]);

  // Metronome timer tick simulation
  useEffect(() => {
    let metronomeInterval: any;
    if (isMetronomePlaying) {
      const intervalMs = (60 / tempo) * 1000;
      metronomeInterval = setInterval(() => {
        // Simple visual metronome flash or mock blip using basic beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.06);
        } catch (e) {
          // ignore context state blocks
        }
      }, intervalMs);
    }
    return () => clearInterval(metronomeInterval);
  }, [isMetronomePlaying, tempo]);

  const selectedPad = drumPads.find(p => p.id === selectedPadId);

  return (
    <div id="mpc-drum-kit-panel" className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070707] text-[#D0D0D0]">
      
      {/* Workspace Ribbon */}
      <div className="p-6 border-b border-[#1F1F1F] bg-[#0A0A0A]/80 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-2xl font-serif text-white tracking-widest flex items-center gap-2 uppercase">
            <Grid className="w-5 h-5 text-[#C5A059]" /> MPC 16-Pad Drum Sampler
          </h2>
          <p className="font-sans text-xs text-neutral-400 mt-1">
            Assign synth or imported samples onto the 4x4 matrix and trigger them with your keyboard keys in real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {drumPads.some(p => p.name) && (
            <button
              id="download-entire-drum-kit-btn"
              onClick={() => {
                const mappedPads = drumPads.filter(p => p.name);
                const confirmDl = confirm(`Download all ${mappedPads.length} loaded samples in this kit? Your browser will trigger sequential downloads.`);
                if (!confirmDl) return;
                
                mappedPads.forEach((pad, i) => {
                  setTimeout(() => {
                    if (pad.type === 'catalog' && pad.sampleId) {
                      const sampleRef = catalogSamples.find(s => s.id === pad.sampleId);
                      if (sampleRef) onDownloadCatalogSample(sampleRef);
                    } else if (pad.type === 'user' && pad.userFileId) {
                      const fileRef = userFiles.find(f => f.id === pad.userFileId);
                      if (fileRef?.audioUrl) {
                        const link = document.createElement('a');
                        link.href = fileRef.audioUrl;
                        link.download = fileRef.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }
                  }, i * 300);
                });
              }}
              className="flex items-center gap-1.5 px-4 h-10 bg-[#C5A059]/10 border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-all text-xs font-sans rounded-lg text-[#C5A059] cursor-pointer font-bold select-none"
              title="Download all mapped sounds in this kit"
            >
              <Download className="w-4 h-4" /> Download Kit ({drumPads.filter(p => p.name).length})
            </button>
          )}

          {/* Metronome Control block */}
          <div className="flex items-center space-x-3 bg-[#070707]/80 border border-[#1F1F1F] p-2 rounded-lg shrink-0">
          <div className="flex items-center space-x-1.5 px-1">
            <span className={`w-2 h-2 rounded-full ${isMetronomePlaying ? 'bg-[#C5A059] animate-ping' : 'bg-[#222]'}`}></span>
            <span className="font-mono text-[10px] text-neutral-400 uppercase">Metronome</span>
          </div>
          <input
            id="metronome-tempo-input"
            type="number"
            min={60}
            max={220}
            value={tempo}
            onChange={(e) => setTempo(Math.max(60, Math.min(220, Number(e.target.value))))}
            className="w-16 bg-[#161616] border border-[#222] focus:outline-none focus:border-[#C5A059] rounded text-center text-xs text-white font-mono"
            placeholder="BPM"
          />
          <button
            id="metronome-toggle-btn"
            onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
            className={`px-3 py-1 text-xs font-sans rounded font-semibold cursor-pointer transition-colors ${
              isMetronomePlaying ? 'bg-red-950/20 border border-red-500/40 text-red-400' : 'bg-[#C5A059] hover:bg-[#d6b777] text-black'
            }`}
          >
            {isMetronomePlaying ? 'Stop' : 'Tap Loop'}
          </button>
        </div>
        </div>
      </div>

      {/* Main Splitted Grid Layout */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: 4x4 MPC Pads Matrix */}
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2 mb-2 select-none">
            <span className="font-sans text-[10px] uppercase text-[#C5A059] opacity-60 tracking-widest">Playable Pads</span>
            <div className="flex items-center text-[10px] text-neutral-400 font-sans space-x-1 border border-[#1F1F1F] bg-[#111] px-2.5 py-0.5 rounded leading-none select-none">
              <Keyboard className="w-3.5 h-3.5 mr-1" />
              <span>Use keys: QWER / ASDF / ZXCV / 1234</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 bg-[#0A0A0A] p-5 rounded-2xl border border-[#1F1F1F] relative shadow-xl shadow-black/40">
            {drumPads.map((pad, idx) => {
              const isSelected = pad.id === selectedPadId;
              const isPressed = activePressPadId === pad.id;
              const isLoaded = !!pad.name;

              return (
                <button
                  id={`drum-pad-${idx + 1}`}
                  key={pad.id}
                  onClick={() => {
                    onTriggerPad(pad);
                    setSelectedPadId(pad.id);
                  }}
                  className={`aspect-square rounded-xl p-3 text-left flex flex-col justify-between transition-all duration-75 select-none relative group overflow-hidden border cursor-pointer ${
                    isSelected 
                      ? 'shadow-lg shadow-[#C5A059]/10 bg-[#161616] scale-[0.98]' 
                      : 'bg-[#070707] shadow-inner'
                  } ${
                    isPressed 
                      ? 'bg-[#C5A059] border-[#d6b777] text-black scale-95 ring-4 ring-[#C5A059]/20 font-bold' 
                      : isSelected 
                        ? 'border-[#C5A059] text-white shadow-[#C5A059]/10' 
                        : isLoaded 
                          ? 'border-[#222] hover:border-[#C5A059]/40 text-neutral-200 bg-[#0A0A0A]' 
                          : 'border-[#111] text-neutral-600'
                  }`}
                >
                  {/* Top line of Pad: keybind & index */}
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded font-bold ${
                      isPressed 
                        ? 'bg-black text-[#C5A059]' 
                        : isSelected 
                          ? 'bg-[#C5A059] text-black' 
                          : 'bg-[#1F1F1F] text-neutral-400'
                    }`}>
                      {pad.keyBind}
                    </span>
                    <span className="font-mono text-[9px] text-neutral-500">#{idx + 1}</span>
                  </div>

                  {/* Waveform accent thumbnail mock */}
                  {isLoaded && (
                    <div className="h-6 w-full opacity-30 group-hover:opacity-65 transition-opacity flex items-end gap-0.5 pointer-events-none mt-2">
                      {Array.from({ length: 8 }).map((_, bIdx) => (
                        <div 
                          key={bIdx} 
                          className={`w-full rounded-t-sm ${isPressed ? 'bg-black' : isSelected ? 'bg-[#C5A059]' : 'bg-[#C5A059]/50'}`}
                          style={{ height: `${20 + Math.sin(bIdx * 1.5) * 60 + (bIdx % 2 === 0 ? 10 : 0)}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bottom line: Loaded sample label */}
                  <span className={`text-[10px] font-sans font-medium leading-tight line-clamp-2 truncate max-w-full block mt-2 ${
                    isPressed ? 'text-black font-semibold' : isLoaded ? 'text-neutral-100 group-hover:text-[#C5A059]' : 'text-neutral-600'
                  }`}>
                    {pad.name || 'Empty'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick presets loaders */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#1F1F1F] bg-[#111]/30 p-4 rounded-xl select-none">
            <div className="flex items-center space-x-1.5 text-neutral-400">
              <Layers className="w-4 h-4" />
              <div className="text-left leading-none">
                <span className="font-sans font-semibold text-xs text-neutral-200 block">Factory Presets Drum Kits</span>
                <span className="font-mono text-[9px] text-neutral-500 block mt-1">Loads customized pre-mapped 16 notes</span>
              </div>
            </div>

            <div className="flex gap-2">
              {['Trap Sub', 'Boom Bap', 'Synthwave'].map(kitName => (
                <button
                  id={`kit-preset-${kitName.toLowerCase().replace(/ /g, '-')}`}
                  key={kitName}
                  onClick={() => {
                    onLoadCustomKit(kitName);
                    alert(`Loaded ${kitName} 16-pad sampler preset successfully!`);
                  }}
                  className="px-3 py-1.5 rounded bg-[#161616] border border-[#222] hover:border-[#C5A059]/40 hover:text-[#C5A059] text-xs text-neutral-300 font-sans cursor-pointer transition-all"
                >
                  {kitName} Kit
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Specific Pad Properties control panel */}
        <div className="w-full lg:w-80 border border-[#1F1F1F] bg-[#111]/30 rounded-xl p-5 flex flex-col space-y-4 shadow-md">
          <div className="border-b border-[#1F1F1F] pb-3 flex items-center justify-between select-none">
            <span className="font-sans font-semibold text-sm text-neutral-200">Pad Configuration</span>
            {selectedPad && (
              <span className="font-sans text-[10px] text-[#C5A059] font-bold uppercase bg-[#070707] px-2 py-0.5 rounded border border-[#C5A059]/10">
                Pad {drumPads.indexOf(selectedPad) + 1} Selected
              </span>
            )}
          </div>

          {selectedPad ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Visual Title */}
                <div className="mb-4">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-[#C5A059] opacity-60 block mb-1">
                    Currently Loaded Asset
                  </label>
                  <p id="pad-config-asset-name" className="font-sans font-semibold text-sm text-white bg-[#070707] p-2.5 rounded-lg border border-[#1F1F1F] flex items-center gap-2">
                    {selectedPad.name ? `🔊 ${selectedPad.name}` : '🔇 [Unmapped empty note]'}
                  </p>
                </div>

                {/* Dispatch Mapper dropdown from existing catalog items */}
                <div className="mb-4">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-[#C5A059] opacity-60 block mb-1.5">
                    Assign Catalog Sample to Pad
                  </label>
                  <select
                    id="pad-map-catalog-select"
                    className="w-full bg-[#070707] border border-[#222] focus:border-[#C5A059] rounded-lg px-2 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onLoadSampleToPad(selectedPad.id, e.target.value, 'catalog');
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>-- Select drum/inst sample --</option>
                    <optgroup label="Kicks">
                      {catalogSamples.filter(s => s.category === 'Kick').slice(0, 10).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.subCategory})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Snares">
                      {catalogSamples.filter(s => s.category === 'Snare').slice(0, 10).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Hi-Hats">
                      {catalogSamples.filter(s => s.category === 'Hi-Hat').slice(0, 10).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Melodic / Keys">
                      {catalogSamples.filter(s => s.category === 'Melodic').slice(0, 10).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Basses">
                      {catalogSamples.filter(s => s.category === 'Bass').slice(0, 10).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Dispatch Mapper from uploaded user files */}
                {userFiles.length > 0 && (
                  <div className="mb-4">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-[#C5A059] opacity-60 block mb-1.5">
                      Assign Uploaded Sample
                    </label>
                    <select
                      id="pad-map-user-select"
                      className="w-full bg-[#070707] border border-[#222] focus:border-[#C5A059] rounded-lg px-2 py-2 text-xs text-white focus:outline-none cursor-pointer"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onLoadSampleToPad(selectedPad.id, e.target.value, 'user');
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>-- Select custom file --</option>
                      {userFiles.map(file => (
                        <option key={file.id} value={file.id}>{file.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action nodes */}
              <div className="space-y-2 border-t border-[#1F1F1F] pt-4 flex flex-col select-none">
                <button
                  id="pad-trigger-test-btn"
                  onClick={() => onTriggerPad(selectedPad)}
                  disabled={!selectedPad.name}
                  className="w-full py-2 bg-[#161616] border border-[#222] hover:border-[#C5A059]/40 hover:text-white disabled:opacity-40 rounded font-sans text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-[#C5A059]" /> Prevalidate Playback
                </button>

                {selectedPad.name && (
                  <button
                    id="pad-download-sample-btn"
                    onClick={() => {
                      if (selectedPad.type === 'catalog' && selectedPad.sampleId) {
                        const sampleRef = catalogSamples.find(s => s.id === selectedPad.sampleId);
                        if (sampleRef) onDownloadCatalogSample(sampleRef);
                      } else if (selectedPad.type === 'user' && selectedPad.userFileId) {
                        const fileRef = userFiles.find(f => f.id === selectedPad.userFileId);
                        if (fileRef?.audioUrl) {
                          const link = document.createElement('a');
                          link.href = fileRef.audioUrl;
                          link.download = fileRef.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }
                    }}
                    className="w-full py-2 bg-[#C5A059]/10 border border-[#C5A059]/35 hover:bg-[#C5A059] hover:text-black rounded font-sans text-xs flex items-center justify-center gap-1.5 transition-all text-[#C5A059] cursor-pointer font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Mapped Sound
                  </button>
                )}

                <button
                  id="pad-clear-btn"
                  onClick={() => onClearPad(selectedPad.id)}
                  disabled={!selectedPad.name}
                  className="w-full py-2 bg-[#070707] hover:bg-red-955/10 hover:text-red-400 disabled:opacity-40 rounded text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer border border-[#1F1F1F]"
                  title="Clear assignment"
                >
                  <Trash className="w-3.5 h-3.5" /> Clear Pad
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center font-sans py-12 text-neutral-500 text-[10px]">
              Select any pad on the 4x4 matrix to customize its inputs.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
