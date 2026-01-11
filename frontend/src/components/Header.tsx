import { useState, useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useThemeStore } from '../stores/themeStore';
import {
  getVolumeSettings,
  setSoundVolume,
  setVoiceVolume,
  setNotificationsEnabled,
  playTestSound
} from '../utils/notifications';

interface HeaderProps {
  onShowTree?: () => void;
  onShowStats?: () => void;
}

// Monochrome SVG Icons
function KanbanIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function TreeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function ChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function AgentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
    </svg>
  );
}

function SunIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function VolumeIcon({ className = "w-5 h-5", muted = false }: { className?: string; muted?: boolean }) {
  if (muted) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
  );
}

export function Header({ onShowTree, onShowStats }: HeaderProps) {
  const connected = useAgentStore(state => state.connected);
  const agentCount = useAgentStore(state => state.agents.size);
  const { isDark, toggle } = useThemeStore();

  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [settings, setSettings] = useState(getVolumeSettings());

  // Sync settings on mount
  useEffect(() => {
    setSettings(getVolumeSettings());
  }, []);

  const handleSoundVolumeChange = (value: number) => {
    setSoundVolume(value);
    setSettings(prev => ({ ...prev, soundVolume: value }));
  };

  const handleVoiceVolumeChange = (value: number) => {
    setVoiceVolume(value);
    setSettings(prev => ({ ...prev, voiceVolume: value }));
  };

  const handleToggleEnabled = () => {
    const newEnabled = !settings.enabled;
    setNotificationsEnabled(newEnabled);
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
  };

  const handleTestSound = () => {
    playTestSound();
  };

  return (
    <header className="bg-gray-800 dark:bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <KanbanIcon className="w-8 h-8 text-gray-300" />
          <div>
            <h1 className="text-xl font-bold">Agent Kanban</h1>
            <p className="text-xs text-gray-400">Multi-Agent Monitoring Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onShowTree}
            className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
            title="Agent Hierarchy (T)"
          >
            <TreeIcon />
          </button>
          <button
            onClick={onShowStats}
            className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
            title="Statistics (S)"
          >
            <ChartIcon />
          </button>
        </div>

        {/* Agent count */}
        <div className="flex items-center gap-2 bg-gray-700 dark:bg-gray-800 px-4 py-2 rounded-lg">
          <AgentIcon className="w-5 h-5 text-gray-400" />
          <div>
            <span className="text-xl font-bold">{agentCount}</span>
            <span className="text-gray-400 text-sm ml-1">agent{agentCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Connection status */}
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          ${connected
            ? 'bg-gray-700 dark:bg-gray-800 text-gray-300'
            : 'bg-gray-700 dark:bg-gray-800 text-gray-400'
          }
        `}>
          <span
            className={`
              w-2.5 h-2.5 rounded-full
              ${connected
                ? 'bg-emerald-500'
                : 'bg-gray-500'
              }
            `}
          />
          <span className="text-sm font-medium">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Volume control */}
        <div className="relative">
          <button
            onClick={() => setShowVolumePanel(!showVolumePanel)}
            className={`p-2 rounded-lg transition-colors ${
              settings.enabled
                ? 'bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'bg-gray-700 dark:bg-gray-800 text-gray-500'
            }`}
            title="Sound Settings"
          >
            <VolumeIcon muted={!settings.enabled} />
          </button>

          {/* Volume Panel Dropdown */}
          {showVolumePanel && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Notifications</span>
                <button
                  onClick={handleToggleEnabled}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    settings.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                    settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Sound Volume */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sound</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(settings.soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.soundVolume * 100}
                    onChange={(e) => handleSoundVolumeChange(Number(e.target.value) / 100)}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-600 dark:accent-gray-400"
                    disabled={!settings.enabled}
                  />
                </div>

                {/* Voice Volume */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Voice</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(settings.voiceVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.voiceVolume * 100}
                    onChange={(e) => handleVoiceVolumeChange(Number(e.target.value) / 100)}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-600 dark:accent-gray-400"
                    disabled={!settings.enabled}
                  />
                </div>

                {/* Test Button */}
                <button
                  onClick={handleTestSound}
                  disabled={!settings.enabled}
                  className="w-full text-xs py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors disabled:opacity-50"
                >
                  Test Sound
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title={isDark ? 'Switch to light mode (Ctrl+D)' : 'Switch to dark mode (Ctrl+D)'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* Click outside to close volume panel */}
      {showVolumePanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowVolumePanel(false)}
        />
      )}
    </header>
  );
}
