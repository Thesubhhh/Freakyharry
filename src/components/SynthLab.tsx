/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Sliders, 
  Play, 
  DownloadCloud, 
  Sparkles, 
  HelpCircle, 
  Volume2, 
  RefreshCcw,
  Maximize2
} from 'lucide-react';
import { SynthParameters, SampleCategory } from '../types';

interface SynthLabProps {
  currentParams: SynthParameters;
  setCurrentParams: React.Dispatch<React.SetStateAction<SynthParameters>>;
  category: SampleCategory | 'Other';
  setCategory: (category: SampleCategory | 'Other') => void;
  sampleName: string;
  onPreview: (category: SampleCategory | 'Other', params: SynthParameters) => void;
  onDownloadWavDirectly: (name: string, category: SampleCategory | 'Other', params: SynthParameters) => void;
}

export default function SynthLab({
  currentParams,
  setCurrentParams,
  category,
  setCategory,
  sampleName,
  onPreview,
  onDownloadWavDirectly
}: SynthLabProps) {
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customName, setCustomName] = useState('Custom Synth Sample');
  const [activePreset, setActivePreset] = useState<string>('Custom');

  // List of rapid preset setups
  const presets = [
    {
      name: '808 Sub Boom',
      cat: 'Kick' as const,
      params: { pitch: 55, decay: 1.2, waveType: 'sine' as const, overdrive: 15, filterCutoff: 180, delayTime: 0.0, reverbWet: 5 }
    },
    {
      name: 'Gated 80s Snare',
      cat: 'Snare' as const,
      params: { pitch: 180, decay: 0.6, waveType: 'noise' as const, overdrive: 0, filterCutoff: 1200, delayTime: 0.0, reverbWet: 45 }
    },
    {
      name: 'Sizzling Open Hat',
      cat: 'Hi-Hat' as const,
      params: { pitch: 8000, decay: 0.5, waveType: 'noise' as const, overdrive: 0, filterCutoff: 9000, delayTime: 0.25, reverbWet: 15 }
    },
    {
      name: 'Mellow Velvet Rhodes',
      cat: 'Melodic' as const,
      params: { pitch: 261.63, decay: 1.8, waveType: 'triangle' as const, overdrive: 5, filterCutoff: 1500, delayTime: 0.3, reverbWet: 30 }
    },
    {
      name: 'FM Growl Subs',
      cat: 'Bass' as const,
      params: { pitch: 65.41, decay: 0.9, waveType: 'sawtooth' as const, overdrive: 45, filterCutoff: 500, delayTime: 0.0, reverbWet: 0 }
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setCategory(preset.cat);
    setCurrentParams(preset.params);
    setCustomName(`${preset.name} Mod`);
    setActivePreset(preset.name);
  };

  // Synchronise name inputs with selected sample
  useEffect(() => {
    if (sampleName) {
      setCustomName(`${sampleName} Edited`);
      setActivePreset('Custom Mod');
    }
  }, [sampleName]);

  // Waveform visualization calculation drawing on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw gridlines
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 1;
      
      // Horizontal grid
      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Vertical grid
      for (let x = 40; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw mathematical simulated waveform based on synth knobs
      ctx.beginPath();
      ctx.strokeStyle = '#C5A059'; // Sophisticated Gold
      ctx.lineWidth = 2.5;
      
      // Add subtle glow shadow effects
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#C5A059';

      const points = 300;
      const pitchFactor = currentParams.pitch < 200 ? 0.05 : (currentParams.pitch < 2000 ? 0.15 : 0.85);
      const cycles = 4 + (currentParams.pitch * pitchFactor) / 25; // number of wave peaks

      for (let i = 0; i < points; i++) {
        const x = (i / points) * width;
        
        // Amplitude Envelope decaying exponentially
        const timeRatio = i / points;
        const env = Math.exp(-timeRatio * (4 / Math.max(0.1, currentParams.decay)));
        
        // Base sine calculation
        let waveVal = 0;
        
        switch (currentParams.waveType) {
          case 'sine':
            waveVal = Math.sin(timeRatio * cycles * Math.PI * 2 + offset);
            break;
          case 'sawtooth':
            waveVal = ((timeRatio * cycles + offset / (2 * Math.PI)) % 1) * 2 - 1;
            break;
          case 'square':
            waveVal = Math.sin(timeRatio * cycles * Math.PI * 2 + offset) >= 0 ? 1 : -1;
            break;
          case 'triangle':
            waveVal = Math.abs(((timeRatio * cycles + offset / (2 * Math.PI)) % 1) * 2 - 1) * 2 - 1;
            break;
          case 'noise':
            // High frequency rumble for drums
            waveVal = (Math.random() * 2 - 1) * 0.7;
            break;
        }

        // Apply low-pass frequency filter attenuation simulation
        const cutoffRatio = Math.min(20000, currentParams.filterCutoff) / 20000;
        if (currentParams.waveType !== 'noise') {
          waveVal += Math.sin(timeRatio * cycles * 3 * Math.PI + offset) * (1 - cutoffRatio) * 0.2;
        }

        // Apply Distortion/Overdrive (clipping amplitude peaks and expanding)
        if (currentParams.overdrive > 0) {
          const driveMultiplier = 1 + (currentParams.overdrive / 12);
          waveVal = Math.max(-0.95, Math.min(0.95, waveVal * driveMultiplier));
        }

        // Apply reverb/delay ripples
        if (currentParams.delayTime > 0.01 && timeRatio > 0.3) {
          waveVal += Math.sin((timeRatio - 0.3) * cycles * Math.PI * 2) * 0.25;
        }

        const y = midY + waveVal * env * (height * 0.42);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      
      // Reset shadows
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Animate active waveform slightly if previewing/active
      offset += 0.09;
      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [currentParams, category]);

  const updateParam = (key: keyof SynthParameters, val: any) => {
    setCurrentParams(prev => ({
      ...prev,
      [key]: val
    }));
    setActivePreset('Custom');
  };

  const handleExport = () => {
    onDownloadWavDirectly(customName, category, currentParams);
  };

  return (
    <div id="synth-lab-panel" className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070707] text-[#E0E0E0]">
      
      {/* Tab Header Banner */}
      <div className="p-6 border-b border-[#1F1F1F] bg-[#0A0A0A]/80 backdrop-blur select-none">
        <h2 className="text-2xl font-serif text-white tracking-widest flex items-center gap-2 uppercase">
          <Sliders className="w-5 h-5 text-[#C5A059]" /> Wave Synth Lab
        </h2>
        <p className="font-sans text-xs text-neutral-400 mt-1">
          Perform digital physical modeling and download tailored high-fidelity audio samples directly in your DAW
        </p>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col xl:flex-row gap-6">
        
        {/* Left Side: Waveform Oscilloscope & Trigger Panel */}
        <div className="flex-1 flex flex-col space-y-4">
          
          {/* Oscilloscope Visualizer Card */}
          <div className="border border-[#1F1F1F] bg-[#0F0F0F] rounded-xl p-5 shadow-inner relative overflow-hidden group">
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-[#070707]/80 px-2.5 py-1 rounded border border-[#1F1F1F] backdrop-blur select-none z-10">
              <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping"></span>
              <span className="font-mono text-[10px] text-[#C5A059] tracking-wider font-semibold uppercase">Wave Oscilloscope</span>
            </div>

            <div className="absolute top-4 right-4 flex items-center space-x-1 capitalize text-[10px] text-neutral-400 font-semibold bg-[#111] border border-[#1F1F1F] px-2 py-0.8 rounded select-none z-10">
              <span>{category}s Mode</span>
            </div>

            {/* Central Canvas element */}
            <div className="w-full flex items-center justify-center p-2 rounded-lg bg-[#070707]/60 mt-6 mb-2 border border-[#1F1F1F]">
              <canvas 
                id="waveshape-oscilloscope-canvas"
                ref={canvasRef} 
                width={500} 
                height={200}
                className="w-full h-48 bg-transparent max-w-2xl rounded-md"
              />
            </div>

            <div className="flex items-center justify-between font-mono text-[9px] text-neutral-500 mt-1 uppercase select-none">
              <span>0.00s Attack</span>
              <span>Spectral Decay Window</span>
              <span>{currentParams.decay}s Release</span>
            </div>
          </div>

          {/* Quick Preset Selector Rack */}
          <div className="border border-[#1F1F1F] bg-[#111]/30 rounded-xl p-4">
            <span className="font-sans text-[10px] uppercase tracking-widest text-[#C5A059] opacity-60 block mb-2 select-none">
              Preset Quick Templates
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {presets.map(p => (
                <button
                  id={`preset-btn-${p.name.toLowerCase().replace(/ /g, '-')}`}
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-2 rounded-md font-sans text-xs text-center border transition-all truncate cursor-pointer ${
                    activePreset === p.name 
                      ? 'bg-[#C5A059] border-[#C5A059] text-black font-semibold shadow shadow-[#C5A059]/10' 
                      : 'bg-[#161616] border-[#222] hover:border-[#C5A059]/40 text-neutral-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Card */}
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Custom Exporter details and tags input */}
            <div className="flex-1">
              <label className="font-sans text-[10px] uppercase tracking-widest text-[#C5A059] opacity-60 block mb-1">
                Custom Sample Name on Export
              </label>
              <input
                id="synth-custom-name-input"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Custom sample filename..."
                className="w-full bg-[#161616] border border-[#222] focus:border-[#C5A059] rounded-lg px-4 py-2 text-sm text-white focus:outline-none placeholder-neutral-600 transition-colors"
              />
            </div>

            {/* Render Operations */}
            <div className="flex gap-2.5 shrink-0 self-end md:self-center">
              <button
                id="synth-audition-trigger-btn"
                onClick={() => onPreview(category, currentParams)}
                className="h-11 px-5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 hover:border-[#C5A059] text-[#C5A059] hover:text-white hover:bg-[#C5A059]/20 transition-all font-sans font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#C5A059]/5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Audition Node</span>
              </button>

              <button
                id="synth-export-wav-btn"
                onClick={handleExport}
                className="h-11 px-5 rounded-lg bg-[#C5A059] hover:bg-[#d6b777] text-black font-bold font-sans text-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg shadow-[#C5A059]/10"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Bake & Export WAV</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Dial/Rotary Parameters Sliders */}
        <div className="w-full xl:w-96 border border-[#1F1F1F] bg-[#111]/30 rounded-xl p-5 flex flex-col space-y-5">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3 select-none">
            <span className="font-sans font-semibold text-sm text-neutral-200">Synthesis Parameters</span>
            <div className="flex items-center space-x-1.5 text-[#C5A059] backdrop-blur font-sans text-[10px] border border-[#C5A059]/20 bg-[#C5A059]/10 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time Synthesizer</span>
            </div>
          </div>

          {/* Synth Source Switcher */}
          <div>
            <label className="font-sans text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 select-none">
              Sound Profile Generator
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Kick', 'Snare', 'Hi-Hat', 'Melodic', 'Bass', 'Other'] as const).map(catItem => (
                <button
                  id={`synth-profile-btn-${catItem.toLowerCase().replace('/', '-')}`}
                  key={catItem}
                  onClick={() => {
                    setCategory(catItem);
                    updateParam('pitch', getPitchOffsetForCategory(catItem));
                    setActivePreset('Custom');
                  }}
                  className={`py-1.5 rounded text-xs transition-colors cursor-pointer font-sans leading-none ${
                    category === catItem 
                      ? 'bg-[#C5A059]/10 text-[#C5A059] font-bold border border-[#C5A059]/40' 
                      : 'bg-[#161616] text-[#888] hover:text-white border border-[#222] hover:border-[#C5A059]/40'
                  }`}
                >
                  {catItem}s
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Controllers Grid */}
          <div className="space-y-4 flex-1">
            
            {/* Pitch Hz */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Base Oscillations (Pitch)</span>
                <span className="text-[#C5A059] font-bold">{currentParams.pitch.toFixed(1)} Hz</span>
              </div>
              <input
                id="synth-slider-pitch"
                type="range"
                min={20}
                max={category === 'Hi-Hat' ? 12000 : 2500}
                step={0.5}
                value={currentParams.pitch}
                onChange={(e) => updateParam('pitch', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Decay Length */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Envelope Decay / Release</span>
                <span className="text-[#C5A059] font-bold">{currentParams.decay.toFixed(2)} sec</span>
              </div>
              <input
                id="synth-slider-decay"
                type="range"
                min={0.05}
                max={3.0}
                step={0.05}
                value={currentParams.decay}
                onChange={(e) => updateParam('decay', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Wave Type */}
            <div>
              <label className="font-sans text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 select-none">
                Oscillator Shape
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(['sine', 'square', 'sawtooth', 'triangle', 'noise'] as const).map(shape => (
                  <button
                    id={`wave-shape-btn-${shape}`}
                    key={shape}
                    onClick={() => updateParam('waveType', shape)}
                    disabled={category === 'Snare' || category === 'Hi-Hat'}
                    className={`text-[10px] py-1 border rounded capitalize transition-all select-none disabled:opacity-40 disabled:hover:border-neutral-950 cursor-pointer ${
                      currentParams.waveType === shape 
                        ? 'bg-[#C5A059]/10 border-[#C5A059]/40 text-[#C5A059] font-semibold' 
                        : 'bg-[#161616] border-[#222] text-[#888] hover:text-white'
                    }`}
                  >
                    {shape}
                  </button>
                    ))}
              </div>
              {(category === 'Snare' || category === 'Hi-Hat') && (
                <span className="font-mono text-[9px] text-neutral-500 mt-1 block select-none">
                  * Locked to 'noise' matrix generator for organic drum timbres
                </span>
              )}
            </div>

            {/* Filter Cutoff */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Filter Cutoff Frequency</span>
                <span className="text-[#C5A059] font-bold">{currentParams.filterCutoff} Hz</span>
              </div>
              <input
                id="synth-slider-filter"
                type="range"
                min={50}
                max={15000}
                step={50}
                value={currentParams.filterCutoff}
                onChange={(e) => updateParam('filterCutoff', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Overdrive Distortion */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Overdrive Scl / Limiter</span>
                <span className="text-[#C5A059] font-bold">{currentParams.overdrive}% Drive</span>
              </div>
              <input
                id="synth-slider-overdrive"
                type="range"
                min={0}
                max={100}
                value={currentParams.overdrive}
                onChange={(e) => updateParam('overdrive', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Delay Time */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Stereo Delay Feedback</span>
                <span className="text-[#C5A059] font-bold">
                  {currentParams.delayTime === 0 ? 'OFF' : `${(currentParams.delayTime * 1000).toFixed(0)} ms`}
                </span>
              </div>
              <input
                id="synth-slider-delay"
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={currentParams.delayTime}
                onChange={(e) => updateParam('delayTime', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Reverb Space */}
            <div>
              <div className="flex justify-between font-mono text-xs text-neutral-400 mb-1.5 select-none">
                <span>Reverb Dry / Wet Space</span>
                <span className="text-[#C5A059] font-bold">{currentParams.reverbWet}% Wet</span>
              </div>
              <input
                id="synth-slider-reverb"
                type="range"
                min={0}
                max={100}
                value={currentParams.reverbWet}
                onChange={(e) => updateParam('reverbWet', Number(e.target.value))}
                className="w-full accent-[#C5A059] bg-[#070707] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

          </div>

          <div className="pt-2 text-center text-xs text-neutral-500 font-mono leading-relaxed border-t border-[#1F1F1F] py-1 select-none">
            Adjust curves above to synthesize your signature sample and click "Export WAV".
          </div>

        </div>

      </div>

    </div>
  );
}

// Helpers pitches fallback
function getPitchOffsetForCategory(category: SampleCategory | 'Other'): number {
  switch (category) {
    case 'Kick': return 55;
    case 'Snare': return 190;
    case 'Hi-Hat': return 8000;
    case 'Melodic': return 261.63;
    case 'Bass': return 65.41;
    default: return 440;
  }
}
