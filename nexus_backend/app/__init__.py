# app/__init__.py
# Initialisierungsdatei für das app-Modul

# Import von main.py im selben Verzeichnis
from .main import app

# Exportiere die app explizit
__all__ = ['app'] 