/**
 * KnowThankYew Reality Engine v2.0 - Distributed Amnesia Mesh Coordinator
 *
 * Provides instant, zero-latency cross-tab and cross-context session amnesia synchronization
 * using standard BroadcastChannel APIs. Operates alongside chrome.tabs.sendMessage as a
 * redundant, high-speed broadcast tier to guarantee simultaneous memory and DOM teardown.
 */

export const AMNESIA_MESH_CHANNEL = 'kty_amnesia_mesh';

export interface AmnesiaMeshBurnEvent {
  type: 'KTY_MESH_HARD_BURN';
  timestamp: number;
}

let meshChannel: BroadcastChannel | null = null;

function getMeshChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!meshChannel) {
    try {
      meshChannel = new BroadcastChannel(AMNESIA_MESH_CHANNEL);
    } catch {
      meshChannel = null;
    }
  }
  return meshChannel;
}

/**
 * Broadcasts an atomic Hard Burn signal to all listening browser contexts.
 */
export function broadcastAmnesiaMeshBurn(): void {
  const channel = getMeshChannel();
  if (channel) {
    try {
      const payload: AmnesiaMeshBurnEvent = {
        type: 'KTY_MESH_HARD_BURN',
        timestamp: Date.now(),
      };
      channel.postMessage(payload);
    } catch {
      // Non-fatal if channel post fails
    }
  }
}

/**
 * Subscribes to the distributed amnesia mesh. When an atomic Hard Burn
 * is received from any window, popup, or background worker, onBurn is invoked.
 *
 * @returns Unsubscribe function to release the channel listener.
 */
export function subscribeAmnesiaMesh(onBurn: () => void): () => void {
  const channel = getMeshChannel();
  if (!channel) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'KTY_MESH_HARD_BURN') {
      try {
        onBurn();
      } catch {
        // Individual callback failure must not break mesh
      }
    }
  };

  channel.addEventListener('message', handler);

  return () => {
    try {
      channel.removeEventListener('message', handler);
    } catch {
      // Best-effort cleanup
    }
  };
}

/**
 * Closes the local mesh channel handle (used primarily in test teardown).
 */
export function closeAmnesiaMesh(): void {
  if (meshChannel) {
    try {
      meshChannel.close();
    } catch {
      // Ignore close errors
    }
    meshChannel = null;
  }
}
