import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SensorPacket } from '../types/iot';

const WS_GATEWAY_URL = 'http://localhost:3001';
const MAX_HISTORY = 40; // Maintain last 40 time-series points for realtime chart

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestPacket, setLatestPacket] = useState<SensorPacket | null>(null);
  const [streamHistory, setStreamHistory] = useState<SensorPacket[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_GATEWAY_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to IoT Gateway WebSocket Hub');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from IoT Gateway');
      setIsConnected(false);
    });

    socket.on('dashboard:update', (packet: SensorPacket) => {
      setLatestPacket(packet);
      setStreamHistory((prev) => {
        const next = [...prev, packet];
        if (next.length > MAX_HISTORY) {
          return next.slice(next.length - MAX_HISTORY);
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Send reset command through websocket directly
  const resetSystem = () => {
    if (socketRef.current) {
      socketRef.current.emit('system:reset_request');
    }
  };

  return {
    isConnected,
    latestPacket,
    streamHistory,
    resetSystem,
  };
}
