import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from 'ws';
import fetch from 'node-fetch';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true
  });

  // Define Kraken API proxy endpoints
  // This helps to avoid CORS issues with direct client requests
  app.get('/api/kraken/ohlc', async (req, res) => {
    try {
      const { pair, interval, since } = req.query;
      
      // Validate required parameters
      if (!pair) {
        return res.status(400).json({ 
          error: ['Missing required parameter: pair'] 
        });
      }
      
      // Build URL with proper parameter handling
      const params = new URLSearchParams();
      params.append('pair', pair as string);
      
      if (interval) {
        params.append('interval', interval as string);
      }
      
      if (since) {
        params.append('since', since as string);
      }
      
      const url = `https://api.kraken.com/0/public/OHLC?${params.toString()}`;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken OHLC request:', error);
      res.status(500).json({ 
        error: ['Failed to fetch OHLC data from Kraken API'] 
      });
    }
  });

  app.get('/api/kraken/ticker', async (req, res) => {
    try {
      const { pair } = req.query;
      
      // Validate required parameters
      if (!pair) {
        return res.status(400).json({ 
          error: ['Missing required parameter: pair'] 
        });
      }
      
      // Build URL with proper parameter handling
      const params = new URLSearchParams();
      params.append('pair', pair as string);
      
      const url = `https://api.kraken.com/0/public/Ticker?${params.toString()}`;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken Ticker request:', error);
      res.status(500).json({ 
        error: ['Failed to fetch ticker data from Kraken API']
      });
    }
  });

  app.get('/api/kraken/assetpairs', async (req, res) => {
    try {
      const url = 'https://api.kraken.com/0/public/AssetPairs';
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken AssetPairs request:', error);
      res.status(500).json({ 
        error: ['Failed to fetch asset pairs from Kraken API']
      });
    }
  });

  // Maximum number of clients we'll support
  const MAX_CLIENTS = 5;
  
  // Track the number of active Kraken connections
  let activeKrakenConnections = 0;
  
  // Create a shared Kraken WebSocket connection
  let sharedKrakenWs: WebSocket | null = null;
  let krakenClients = new Set<WebSocket>();
  
  // Setup shared Kraken WebSocket connection
  function setupKrakenWebSocket() {
    if (sharedKrakenWs && (sharedKrakenWs.readyState === WebSocket.OPEN || 
                          sharedKrakenWs.readyState === WebSocket.CONNECTING)) {
      return sharedKrakenWs;
    }
    
    activeKrakenConnections++;
    console.log(`Creating Kraken WebSocket connection (active: ${activeKrakenConnections})`);
    
    sharedKrakenWs = new WebSocket('wss://ws.kraken.com');
    
    sharedKrakenWs.on('open', () => {
      console.log('Connected to Kraken WebSocket API');
      
      // Resubscribe all clients if we reconnected
      krakenClients.forEach(client => {
        // Send a ping to each client to verify connection
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'status', connected: true }));
        }
      });
    });
    
    sharedKrakenWs.on('message', (data) => {
      // Broadcast to all connected clients
      krakenClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });
    
    sharedKrakenWs.on('error', (error) => {
      console.error('Kraken WebSocket error:', error);
    });
    
    sharedKrakenWs.on('close', () => {
      console.log('Kraken WebSocket connection closed');
      sharedKrakenWs = null;
      activeKrakenConnections--;
      
      // Notify clients of disconnection
      krakenClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'status', connected: false }));
        }
      });
      
      // Attempt to reconnect if we still have clients
      if (krakenClients.size > 0) {
        console.log('Attempting to reconnect to Kraken WebSocket...');
        setTimeout(setupKrakenWebSocket, 2000);
      }
    });
    
    return sharedKrakenWs;
  }
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Check if we have too many connections already
    if (krakenClients.size >= MAX_CLIENTS) {
      console.warn('Too many WebSocket clients, rejecting connection');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Too many connections to the server.' 
      }));
      ws.close();
      return;
    }
    
    // Add to our client tracking
    krakenClients.add(ws);
    
    // Setup or get the shared Kraken connection
    const krakenWs = setupKrakenWebSocket();
    
    // Let the client know about our connection status
    if (krakenWs.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'status', connected: true }));
    } else {
      ws.send(JSON.stringify({ type: 'status', connected: false }));
    }
    
    // Handle messages from client
    ws.on('message', (message) => {
      try {
        // Forward subscription requests to Kraken
        if (krakenWs.readyState === WebSocket.OPEN) {
          krakenWs.send(message);
        } else {
          console.log('Kraken WebSocket not ready, buffering message');
          // Notify client of pending connection
          ws.send(JSON.stringify({ 
            type: 'status', 
            connected: false, 
            message: 'Connecting to Kraken...' 
          }));
        }
      } catch (error) {
        console.error('Error handling client message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      krakenClients.delete(ws);
      
      // If no more clients, close the shared connection
      if (krakenClients.size === 0 && sharedKrakenWs && 
          sharedKrakenWs.readyState === WebSocket.OPEN) {
        console.log('No more clients, closing Kraken WebSocket');
        sharedKrakenWs.close();
        sharedKrakenWs = null;
      }
    });
  });

  return httpServer;
}
