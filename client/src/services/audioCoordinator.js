/**
 * Reveria Global Audio Coordinator
 * Enforces single-active-audio invariant across the entire application.
 * Prevents overlapping playback, orphaned background playback across page transitions,
 * and handles route changes cleanly.
 */

const registeredAudioInstances = new Set();
let activeMasterAudio = null;

export const audioCoordinator = {
  /**
   * Register a new or existing audio element in the global pool.
   */
  register(audio) {
    if (!audio) return;
    registeredAudioInstances.add(audio);
  },

  /**
   * Unregister an audio element from the pool.
   */
  unregister(audio) {
    if (!audio) return;
    if (audio === activeMasterAudio) {
      activeMasterAudio = null;
    }
    registeredAudioInstances.delete(audio);
  },

  /**
   * Announce that an audio element has become the active player.
   * Immediately stops and pauses all OTHER audio elements in the application.
   */
  claimExclusivePlayback(currentAudio, sourceTag = 'unknown') {
    if (!currentAudio) return;
    this.register(currentAudio);
    activeMasterAudio = currentAudio;

    registeredAudioInstances.forEach((audio) => {
      if (audio !== currentAudio) {
        try {
          if (audio._fadeTimer) {
            clearInterval(audio._fadeTimer);
            audio._fadeTimer = null;
          }
          if (!audio.paused) {
            audio.pause();
          }
          audio.volume = 0;
        } catch {
          // ignore error on stale or detached audio
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('reveria:exclusive-audio-claimed', {
          detail: { source: sourceTag, audio: currentAudio },
        })
      );
    }
  },

  /**
   * Immediately stops, silences, and resets all audio elements in the app.
   */
  stopAll(reason = 'global-stop') {
    activeMasterAudio = null;
    registeredAudioInstances.forEach((audio) => {
      try {
        if (audio._fadeTimer) {
          clearInterval(audio._fadeTimer);
          audio._fadeTimer = null;
        }
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } catch {
        // ignore
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('reveria:all-audio-stopped', {
          detail: { reason },
        })
      );
    }
  },

  /**
   * Get the current master audio element
   */
  getActiveAudio() {
    return activeMasterAudio;
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => audioCoordinator.stopAll('pagehide'));
  window.addEventListener('beforeunload', () => audioCoordinator.stopAll('beforeunload'));
}
