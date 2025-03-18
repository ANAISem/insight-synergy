const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:8081"], // React-Frontend (verschiedene Ports)
        methods: ["GET", "POST"]
    }
});

// Verschiedene KI-Expertenpersönlichkeiten simulieren
const expertResponses = {
    general: [
        "Das ist eine interessante Frage. Aus allgemeiner KI-Perspektive würde ich sagen...",
        "Ich verstehe dein Anliegen. Hier sind einige Gedanken dazu...",
        "Gute Frage! Als allgemeiner KI-Assistent kann ich dir folgendes vorschlagen...",
        "Basierend auf meinem Wissen würde ich diesen Ansatz empfehlen...",
    ],
    debugging: [
        "Ich sehe das Problem in deinem Code. Versuche folgendes...",
        "Der Fehler könnte mit der Variablendeklaration zusammenhängen. Überprüfe bitte...",
        "Aus Debugging-Sicht würde ich dir empfehlen, erst die Funktion X zu isolieren...",
        "Das sieht nach einem klassischen Race-Condition Problem aus. Du solltest...",
    ],
    architecture: [
        "Für diese Softwarearchitektur würde ich ein Microservices-Ansatz empfehlen, weil...",
        "Bei deinem Projekt könnte das MVVM-Pattern vorteilhaft sein, da...",
        "Architektonisch gesehen, solltest du die Datenbankzugriffe abstrahieren und...",
        "Diese Anforderungen würden gut zu einer Event-Driven-Architecture passen, bei der...",
    ]
};

io.on('connection', (socket) => {
    console.log('Ein Benutzer hat sich verbunden', socket.id);

    socket.on('chat_message', (messageData) => {
        console.log('Nachricht erhalten:', messageData);

        // Zufällige Antwort des gewählten Experten auswählen
        const expertType = messageData.expert || 'general';
        const responses = expertResponses[expertType] || expertResponses.general;
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        // Simulierte Verzögerung, als ob die KI nachdenkt (1-2 Sekunden)
        setTimeout(() => {
            io.to(socket.id).emit('chat_message', {
                text: randomResponse,
                sender: 'ai'
            });
        }, 1000 + Math.random() * 1000);
    });

    socket.on('disconnect', () => {
        console.log('Ein Benutzer hat die Verbindung getrennt', socket.id);
    });
});

const PORT = 5001;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
}); 