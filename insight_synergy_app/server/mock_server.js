const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');

// Express-App initialisieren
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Server erstellen
const server = http.createServer(app);

// WebSocket-Server initialisieren
const wss = new WebSocket.Server({ server });

// Alle verbundenen Clients
const clients = new Set();

// WebSocket-Verbindungshandler
wss.on('connection', (ws) => {
    console.log('Neuer Client verbunden');
    clients.add(ws);

    // Begrüßungsnachricht senden
    const welcomeMessage = {
        type: 'message',
        data: {
            id: Date.now().toString(),
            content: 'Willkommen beim Insight Synergy Test-Server!',
            sender: 'system',
            timestamp: new Date().toISOString(),
            isError: false
        }
    };

    ws.send(JSON.stringify(welcomeMessage));

    // Nachrichtenhandler
    ws.on('message', (message) => {
        console.log('Empfangene Nachricht:', message.toString());
        
        try {
            const parsedMessage = JSON.parse(message);
            
            // Echo die Nachricht zurück mit Server-Antwort
            if (parsedMessage.type === 'message') {
                const responseMessage = {
                    type: 'message',
                    data: {
                        id: Date.now().toString(),
                        content: `Antwort auf: "${parsedMessage.data.content}"`,
                        sender: 'system',
                        timestamp: new Date().toISOString(),
                        isError: false
                    }
                };
                
                setTimeout(() => {
                    ws.send(JSON.stringify(responseMessage));
                }, 500); // Kleine Verzögerung für realistischeres Verhalten
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Ungültiges Nachrichtenformat'
            }));
        }
    });

    // Verbindung geschlossen
    ws.on('close', () => {
        console.log('Client-Verbindung geschlossen');
        clients.delete(ws);
    });
});

// REST API-Endpunkte
app.post('/api/message', (req, res) => {
    console.log('HTTP-Nachricht empfangen:', req.body);
    
    // Echo die Nachricht zurück
    res.json({
        success: true,
        message: {
            id: Date.now().toString(),
            content: `HTTP-Antwort: "${req.body.content}"`,
            sender: 'system',
            timestamp: new Date().toISOString(),
            isError: false
        }
    });
});

// Starte den Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log(`WebSocket-Server läuft auf ws://localhost:${PORT}/ws`);
}); 