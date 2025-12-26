import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = 'http://localhost:5401';

// Singleton socket instance
let socketInstance: TypedSocket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Create singleton socket if not exists
    if (!socketInstance) {
      socketInstance = io(SERVER_URL);
    }
    socketRef.current = socketInstance;

    const socket = socketInstance;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
  };
}

export type { TypedSocket };
