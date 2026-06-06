/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Music, 
  Cloud, 
  Settings, 
  Sliders, 
  Grid, 
  Database,
  Search,
  FolderOpen,
  Plus,
  Play
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  folderCount: number;
  savedSampleCount: number;
  onNewFolderClick: () => void;
  cloudFilesCount: number;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  folderCount, 
  savedSampleCount,
  onNewFolderClick,
  cloudFilesCount
}: SidebarProps) {
  
  const menuItems = [
    { id: 'catalog', name: 'Sample Catalog', icon: Music, desc: '1,000+ Procedural Samples' },
    { id: 'cloud', name: 'My Cloud Library', icon: Cloud, desc: 'Folders & uploaded files' },
    { id: 'kit', name: 'MPC Drum Builder', icon: Grid, desc: 'Playable 4x4 Sampler Grid' },
    { id: 'synth', name: 'Wave Synth Lab', icon: Sliders, desc: 'Tweak & Export custom WAVs' },
  ];

  // Storage estimation based on platform count and mock upload file sizes
  const totalSlotsCount = savedSampleCount + cloudFilesCount;
  const estimatedSizeMb = (totalSlotsCount * 1.1).toFixed(1);
  const storagePercentage = Math.min((totalSlotsCount / 200) * 100, 100);

  return (
    <aside id="sidebar-panel" className="w-72 bg-[#0F0F0F] border-r border-[#1F1F1F] flex flex-col h-screen text-neutral-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1F1F1F] flex items-center space-x-3 select-none">
        <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-serif italic text-[#C5A059] tracking-widest leading-none">SONIC</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059]/60 font-sans mt-1">Archive Pro</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <span className="font-sans text-[10px] tracking-widest text-[#C5A059] opacity-60 px-3 block mb-2 select-none uppercase">
          Library
        </span>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`nav-${item.id}`}
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-150 relative group ${
                isActive 
                  ? 'bg-[#161616] border-l-2 border-[#C5A059] text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-[#161616]/50'
              }`}
            >
              <IconComponent className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-[#C5A059]' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
              <div className="flex-1">
                <span className="font-sans font-medium text-sm block leading-none">{item.name}</span>
                <span className="font-mono text-[10px] text-neutral-500 block mt-1 leading-none">{item.desc}</span>
              </div>
              {isActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#C5A059]"></div>
              )}
            </button>
          );
        })}

        {/* Cloud Utility Controls within Navigation Panel */}
        <div className="pt-6 mt-6 border-t border-[#1F1F1F]">
          <div className="flex items-center justify-between px-3 mb-3 select-none">
            <span className="font-sans text-[10px] tracking-widest text-[#C5A059] opacity-60 uppercase">
              Folders
            </span>
            <button
              id="sidebar-add-folder-btn"
              onClick={onNewFolderClick}
              className="p-1 rounded hover:bg-[#161616] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Create Custom Folder"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button
            id="sidebar-cloud-btn"
            onClick={() => setCurrentTab('cloud')}
            className={`w-full flex items-center px-3 py-2 rounded-md font-sans text-sm text-left transition-all duration-150 ${
              currentTab === 'cloud' 
                ? 'text-[#C5A059] bg-[#C5A059]/10' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            <span className="flex-1 truncate font-serif italic">Total Folders</span>
            <span className="font-mono text-xs text-[#C5A059] font-bold bg-[#C5A059]/10 px-1.5 py-0.5 rounded ml-2">
              {folderCount}
            </span>
          </button>
        </div>
      </nav>

      {/* Cloud Storage Usage Banner */}
      <div className="p-4 bg-[#0A0A0A] border-t border-[#1F1F1F] select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-neutral-400">
            <Cloud className="w-3.5 h-3.5" />
            <span className="font-sans text-xs font-semibold">CLOUD SYNC</span>
          </div>
          <span className="font-mono text-[10px] text-neutral-500">{totalSlotsCount} / 200 slots</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-[#1F1F1F] h-1.5 rounded-full overflow-hidden mb-2">
          <div 
            className="bg-[#C5A059] h-full rounded-full transition-all duration-300"
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between font-mono text-[9px] text-neutral-500">
          <span>{estimatedSizeMb} MB used</span>
          <span className="text-[#C5A059]">{storagePercentage.toFixed(0)}% Cap</span>
        </div>
      </div>
    </aside>
  );
}
