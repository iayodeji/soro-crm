/**
 * Soro Audio Engine
 * Synthesizes pure UI sound feedback using the browser Web Audio API.
 * This ensures Soro behaves like an interactive, tactile product.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a modern, satisfying UI bubble pop sound for positive success events.
 */
export function playSuccessPop() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Bubble sound: rapid pitch shift upwards
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {
    // Fail silently if browser blocks audio
  }
}

/**
 * Plays a soft, neutral metallic tap for informational logs.
 */
export function playInfoTap() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, now);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

/**
 * Plays a dual-tone attention grabber simulating a lock screen FCM push notification.
 */
export function playFCMPushSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Dual crystal chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.setValueAtTime(1046.5, now + 0.08); // C6
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.5, now); // E6
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {}
}

/**
 * Plays a warm, gentle diagnostic chime for failures or warnings.
 */
export function playWarningChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.25);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}
