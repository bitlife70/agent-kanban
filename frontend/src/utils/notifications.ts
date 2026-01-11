/**
 * Sound and voice notification utilities
 * Uses Web Speech API for voice and Web Audio API for sounds
 */

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

// Volume settings (0-1)
let soundVolume = 0.5;
let voiceVolume = 0.8;
let notificationsEnabled = true;

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem('agent-kanban-notifications');
    if (saved) {
      const settings = JSON.parse(saved);
      soundVolume = settings.soundVolume ?? 0.5;
      voiceVolume = settings.voiceVolume ?? 0.8;
      notificationsEnabled = settings.enabled ?? true;
    }
  } catch (e) {
    // Ignore
  }
}

// Save settings to localStorage
function saveSettings() {
  try {
    localStorage.setItem('agent-kanban-notifications', JSON.stringify({
      soundVolume,
      voiceVolume,
      enabled: notificationsEnabled
    }));
  } catch (e) {
    // Ignore
  }
}

// Initialize settings
loadSettings();

/**
 * Get current volume settings
 */
export function getVolumeSettings() {
  return {
    soundVolume,
    voiceVolume,
    enabled: notificationsEnabled
  };
}

/**
 * Set sound volume (0-1)
 */
export function setSoundVolume(volume: number) {
  soundVolume = Math.max(0, Math.min(1, volume));
  saveSettings();
}

/**
 * Set voice volume (0-1)
 */
export function setVoiceVolume(volume: number) {
  voiceVolume = Math.max(0, Math.min(1, volume));
  saveSettings();
}

/**
 * Enable/disable notifications
 */
export function setNotificationsEnabled(enabled: boolean) {
  notificationsEnabled = enabled;
  saveSettings();
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a simple beep sound
 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', baseVolume: number = 0.3) {
  if (!notificationsEnabled || soundVolume === 0) return;

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Apply volume setting
    const volume = baseVolume * soundVolume;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Failed to play tone:', e);
  }
}

/**
 * Play success sound (pleasant chime)
 */
export function playSuccessSound() {
  playTone(523.25, 0.15, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.2), 100); // E5
  setTimeout(() => playTone(783.99, 0.25, 'sine', 0.2), 200); // G5
}

/**
 * Play waiting/attention sound (gentle notification)
 */
export function playWaitingSound() {
  playTone(440, 0.2, 'sine', 0.25); // A4
  setTimeout(() => playTone(554.37, 0.3, 'sine', 0.25), 150); // C#5
}

/**
 * Play error/warning sound (alert beep)
 */
export function playErrorSound() {
  playTone(200, 0.15, 'square', 0.2);
  setTimeout(() => playTone(200, 0.15, 'square', 0.2), 200);
  setTimeout(() => playTone(150, 0.3, 'square', 0.25), 400);
}

/**
 * Speak text using Web Speech API
 */
export function speak(text: string, lang: string = 'ko-KR') {
  if (!notificationsEnabled || voiceVolume === 0) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = voiceVolume;

  // Try to find a Korean voice, fallback to default
  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Play test sound for volume adjustment
 */
export function playTestSound() {
  playTone(440, 0.3, 'sine', 0.3);
}

/**
 * Notify agent status change with sound and voice
 */
export function notifyStatusChange(
  agentName: string,
  status: 'waiting' | 'completed' | 'error',
  message?: string
) {
  if (!notificationsEnabled) return;

  const shortName = agentName.length > 20 ? agentName.slice(0, 20) + '...' : agentName;

  switch (status) {
    case 'waiting':
      playWaitingSound();
      setTimeout(() => {
        speak(message || `${shortName}, 입력 대기 중입니다.`);
      }, 300);
      break;

    case 'completed':
      playSuccessSound();
      setTimeout(() => {
        speak(message || `${shortName}, 작업이 완료되었습니다.`);
      }, 400);
      break;

    case 'error':
      playErrorSound();
      setTimeout(() => {
        speak(message || `${shortName}, 오류가 발생했습니다.`);
      }, 500);
      break;
  }
}

/**
 * Initialize audio context on user interaction
 * (Required for browsers that block autoplay)
 */
export function initAudio() {
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
  // Pre-load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}
