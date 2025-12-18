import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getApiUrl } from '../utils/apiConfig';

export function useSocket(url = null) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Use provided URL, or current app URL, or fallback to localhost
    const socketUrl = url || getApiUrl();
    
    // Initialize socket connection
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      // Only log if it's a real connection error, not a cleanup-related error
      if (error.message && !error.message.includes('closed before the connection is established')) {
        console.error('Socket connection error:', error);
      }
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.disconnect();
      }
      setSocket(null);
      setConnected(false);
    };
  }, [url]);

  return socket;
}

export function useSocketEvent(socket, eventName, callback) {
  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, callback]);
}

