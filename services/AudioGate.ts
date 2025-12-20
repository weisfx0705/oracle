/**
 * AudioGate: Central Audio Context Management & SFX Player
 * 
 * Responsibilities:
 * 1. Manage a single AudioContext for the application.
 * 2. Handle unlocking (resume + warm-up) on user gestures.
 * 3. Provide a unified entry point for playing sound effects (SFX).
 * 4. Queue SFX requests if the context is not yet unlocked/ready.
 */

interface AudioTask {
    url: string;
    options: { volume?: number };
}

let audioContext: AudioContext | null = null;
let isUnlockedState = false;
const playbackQueue: AudioTask[] = [];
const MAX_QUEUE_SIZE = 5;

/**
 * Initializes listeners for potential early unlocking (optional but recommended).
 * Can be called at app startup.
 */
export const initAudioGate = () => {
    const tryUnlock = () => {
        if (!isUnlockedState) {
            unlock().catch(() => { });
        }
    };
    // Attempt to unlock on common interaction events
    const events = ['click', 'touchend', 'keydown'];
    events.forEach(event => {
        window.addEventListener(event, tryUnlock, { once: true, capture: true });
    });
};

/**
 * Gets the shared AudioContext, creating it if necessary.
 * Note: This might return a suspended context if called before unlock.
 */
export const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new CtxClass();
    }
    return audioContext;
};

/**
 * Unlocks the AudioContext within a user gesture.
 * 1. Creates/Resumes AudioContext.
 * 2. Plays a silent warm-up buffer.
 * 3. Processes any queued playback tasks.
 */
export const unlock = async (): Promise<boolean> => {
    const ctx = getAudioContext();

    try {
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Silent warm-up buffer (1 sample)
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        isUnlockedState = true;

        // Process queued items
        while (playbackQueue.length > 0) {
            const task = playbackQueue.shift();
            if (task) {
                playSfx(task.url, task.options).catch(err => console.warn("Queue playback failed", err));
            }
        }

        return true;
    } catch (e) {
        console.warn('AudioGate: Unlock failed', e);
        return false;
    }
};

/**
 * Checks if the audio context is unlocked and running.
 */
export const isUnlocked = (): boolean => {
    return isUnlockedState && audioContext?.state === 'running';
};

/**
 * Plays a sound effect from a URL.
 * If not unlocked, queues the request (and attempts auto-unlock if possible).
 */
export const playSfx = async (url: string, { volume = 1 } = {}): Promise<boolean> => {
    // If not unlocked, queue it
    if (!isUnlocked()) {
        if (playbackQueue.length >= MAX_QUEUE_SIZE) {
            playbackQueue.shift(); // Remove oldest
        }
        playbackQueue.push({ url, options: { volume } });

        // Optimistic unlock attempt (works if this call is already inside a handler)
        unlock().catch(() => { });

        return false; // Did not play immediately
    }

    const ctx = getAudioContext();

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
        return true;
    } catch (e) {
        console.warn(`AudioGate: Failed to play SFX (${url})`, e);
        // Optional: show user feedback here or invoke a callback
        return false;
    }
};
