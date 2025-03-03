#!/usr/bin/env python3
"""
Einfacher Webserver zum Ausliefern der Nexus Web-Client Anwendung.
Verwendet http.server aus der Python Standardbibliothek.
"""

import http.server
import socketserver
import os
from urllib.parse import urlparse

# Port für den Webserver (unterschiedlich vom Backend-Port!)
PORT = 3000
# Verzeichnis mit den statischen Dateien
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class NexusWebHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler für Nexus Web Client."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        """Handle GET requests."""
        # Standardverhalten für statische Dateien
        return super().do_GET()
    
    def end_headers(self):
        """Add CORS headers for local development."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def run_server():
    """Startet den Webserver."""
    
    with socketserver.TCPServer(("", PORT), NexusWebHandler) as httpd:
        print(f"Nexus Web Client läuft auf http://localhost:{PORT}")
        print(f"Drücke STRG+C zum Beenden")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer wird beendet...")
            httpd.shutdown()

if __name__ == "__main__":
    run_server() 