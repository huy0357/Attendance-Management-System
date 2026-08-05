import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenMemory } from '../../../core/api/axiosInstance';
import { LivePulseResponse, LivePulseRecord } from '../../../shared/models/dashboard.model';

interface WebSocketMessage {
  action: string;
  topic: string;
  timestamp: string;
  data: any;
}

export const useDashboardWebSocket = (enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const token = tokenMemory.getAccessToken();
    if (!token) return;

    // Use current host for websocket, falling back to localhost:8080 if not proxied
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = `${protocol}//${window.location.host}/ws/dashboard?token=${token}`;
    
    // Fallback for non-proxied environments (like production if not behind ingress)
    if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.startsWith('http')) {
      const baseUrlStr = import.meta.env.VITE_API_BASE_URL as string;
      wsUrl = baseUrlStr.replace('http', 'ws') + `/ws/dashboard?token=${token}`;
    }

    const connect = () => {
      if (ws.current?.readyState === WebSocket.OPEN || isConnecting.current) return;
      
      isConnecting.current = true;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        isConnecting.current = false;
        console.log('WebSocket Connected');
        // Subscribe to live pulse topic
        ws.current?.send(JSON.stringify({
          action: 'subscribe',
          topic: 'dashboard.live-pulse'
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.action === 'broadcast' && message.topic === 'dashboard.live-pulse') {
            const newRecord = message.data as LivePulseRecord;
            
            // Update the react-query cache directly to prepend the new record
            queryClient.setQueryData<LivePulseResponse>(['dashboardLivePulse'], (oldData) => {
              if (!oldData) {
                return {
                  records: [newRecord],
                  hasMore: false,
                  lastTimestamp: newRecord.checkInTime || '',
                  totalCount: 1,
                  realTimeEnabled: true,
                };
              }
              
              // Avoid duplicates (in case REST and WS overlap)
              const isDuplicate = oldData.records.some(r => r.id === newRecord.id);
              if (isDuplicate) return oldData;

              const updatedRecords = [newRecord, ...oldData.records];
              // Keep only the latest 20 records to match the limit
              if (updatedRecords.length > 20) {
                updatedRecords.length = 20;
              }
              
              return { ...oldData, records: updatedRecords };
            });
          }
        } catch (error) {
          console.error('WebSocket parse error', error);
        }
      };

      ws.current.onclose = () => {
        isConnecting.current = false;
        // Simple auto reconnect logic
        setTimeout(() => {
          if (enabled) connect();
        }, 5000);
      };
      
      ws.current.onerror = () => {
        isConnecting.current = false;
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on unmount
        ws.current.close();
        ws.current = null;
      }
    };
  }, [enabled, queryClient]);
};
