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
      const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}${since ? `&since=${since}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken OHLC request:', error);
      res.status(500).json({ 
        error: 'Failed to fetch OHLC data from Kraken API'
      });
    }
  });

  app.get('/api/kraken/ticker', async (req, res) => {
    try {
      const { pair } = req.query;
      const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken Ticker request:', error);
      res.status(500).json({ 
        error: 'Failed to fetch ticker data from Kraken API'
      });
    }
  });

  app.get('/api/kraken/assetpairs', async (req, res) => {
    try {
      const url = 'https://api.kraken.com/0/public/AssetPairs';
      
      const response = await fetch(url);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Error proxying Kraken AssetPairs request:', error);
      res.status(500).json({ 
        error: 'Failed to fetch asset pairs from Kraken API'
      });
    }
  });

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Set up Kraken WebSocket connection when client connects
    const krakenWs = new WebSocket('wss://ws.kraken.com');
    
    krakenWs.on('open', () => {
      console.log('Connected to Kraken WebSocket API');
    });
    
    krakenWs.on('message', (data) => {
      // Forward messages from Kraken to the client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
    
    krakenWs.on('error', (error) => {
      console.error('Kraken WebSocket error:', error);
    });
    
    krakenWs.on('close', () => {
      console.log('Kraken WebSocket connection closed');
    });
    
    // Handle messages from client
    ws.on('message', (message) => {
      try {
        // Forward subscription requests to Kraken
        if (krakenWs.readyState === WebSocket.OPEN) {
          krakenWs.send(message);
        }
      } catch (error) {
        console.error('Error handling client message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Clean up Kraken WebSocket connection
      if (krakenWs.readyState === WebSocket.OPEN) {
        krakenWs.close();
      }
    });
  });

  return httpServer;
}
