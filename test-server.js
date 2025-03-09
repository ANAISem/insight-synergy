const express = require('express');
const app = express();
const PORT = 8080;

// Einfache Route
app.get('/', (req, res) => {
  res.send('Test-Server läuft!');
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test-Server läuft auf http://localhost:${PORT}`);
}); 