import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { Shot, Provider } from '@fligen/shared';

const SERVER_URL = 'http://localhost:5401';

export interface AddShotParams {
  imageUrl: string;
  prompt: string;
  provider: Provider;
  model: string;
  width: number;
  height: number;
}

export function useShots() {
  const { socket, connected } = useSocket();
  const [shots, setShots] = useState<Shot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch shots via HTTP as fallback/initial load
  useEffect(() => {
    console.log('[useShots] Fetching initial shots via HTTP...');
    fetch(`${SERVER_URL}/api/shots`)
      .then(res => {
        console.log('[useShots] HTTP response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[useShots] HTTP response data:', data);
        if (data.shots) {
          setShots(data.shots);
          console.log('[useShots] Loaded', data.shots.length, 'shots via HTTP');
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[useShots] HTTP fetch failed:', err);
        setIsLoading(false); // Still clear loading state on error
      });
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) {
      console.log('[useShots] No socket available');
      return;
    }

    console.log('[useShots] Setting up socket listeners, connected:', connected);

    // Initial list from server (via socket)
    const handleList = (shotList: Shot[]) => {
      console.log('[useShots] Received shots:list via socket:', shotList.length, 'shots');
      setShots(shotList);
      setIsLoading(false);
    };

    // Shot added
    const handleAdded = (shot: Shot) => {
      console.log('[useShots] Received shots:added:', shot.id, shot.filename);
      setShots(prev => [...prev, shot]);
    };

    // Shot removed
    const handleRemoved = (id: string) => {
      console.log('[useShots] Received shots:removed:', id);
      setShots(prev => prev.filter(s => s.id !== id));
    };

    // All shots cleared
    const handleCleared = () => {
      console.log('[useShots] Received shots:cleared');
      setShots([]);
    };

    socket.on('shots:list', handleList);
    socket.on('shots:added', handleAdded);
    socket.on('shots:removed', handleRemoved);
    socket.on('shots:cleared', handleCleared);

    return () => {
      socket.off('shots:list', handleList);
      socket.off('shots:added', handleAdded);
      socket.off('shots:removed', handleRemoved);
      socket.off('shots:cleared', handleCleared);
    };
  }, [socket, connected]);

  // Add shot via API
  const addShot = useCallback(async (params: AddShotParams): Promise<boolean> => {
    console.log('[useShots] Adding shot:', params.provider, params.model);
    try {
      const response = await fetch(`${SERVER_URL}/api/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[useShots] Failed to add shot:', response.status, text);
        return false;
      }

      const data = await response.json();
      console.log('[useShots] Shot added successfully:', data);
      return true;
    } catch (error) {
      console.error('[useShots] Error adding shot:', error);
      return false;
    }
  }, []);

  // Remove shot via API
  const removeShot = useCallback(async (id: string): Promise<boolean> => {
    console.log('[useShots] Removing shot:', id);
    try {
      const response = await fetch(`${SERVER_URL}/api/shots/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[useShots] Failed to remove shot:', response.status, text);
        return false;
      }

      console.log('[useShots] Shot removed successfully');
      return true;
    } catch (error) {
      console.error('[useShots] Error removing shot:', error);
      return false;
    }
  }, []);

  // Clear all shots via API
  const clearShots = useCallback(async (): Promise<boolean> => {
    console.log('[useShots] Clearing all shots');
    try {
      const response = await fetch(`${SERVER_URL}/api/shots/clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[useShots] Failed to clear shots:', response.status, text);
        return false;
      }

      console.log('[useShots] All shots cleared successfully');
      return true;
    } catch (error) {
      console.error('[useShots] Error clearing shots:', error);
      return false;
    }
  }, []);

  return {
    shots,
    isLoading,
    addShot,
    removeShot,
    clearShots,
  };
}
