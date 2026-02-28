import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = 'http://localhost:5401';

// Singleton socket instance
let socketInstance: TypedSocket | null = null;

function getOrCreateSocket(): TypedSocket {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL);
  }
  return socketInstance;
}

export function useSocket() {
  const [socket] = useState<TypedSocket>(() => getOrCreateSocket());
  const [connected, setConnected] = useState(() => getOrCreateSocket().connected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return {
    socket,
    connected,
  };
}

export type { TypedSocket };
