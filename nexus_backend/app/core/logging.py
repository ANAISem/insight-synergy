import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def setup_logger(name=None, level=None):
    """
    Konfiguriert und gibt einen Logger zurück
    """
    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO")
    
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        numeric_level = logging.INFO
    
    # Root-Logger konfigurieren
    logger = logging.getLogger(name)
    logger.setLevel(numeric_level)
    
    # Wenn der Logger bereits Handler hat, nicht erneut konfigurieren
    if logger.handlers:
        return logger
    
    # Konsolen-Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    
    # Formatierung
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Handler hinzufügen
    logger.addHandler(console_handler)
    
    # Log-Verzeichnis erstellen, falls es nicht existiert
    log_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # Datei-Handler für rotierende Logs
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "nexus_backend.log"),
        maxBytes=10*1024*1024,  # 10 MB
        backupCount=5
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    logger.info(f"Logging konfiguriert mit Level: {level}")
    return logger

def get_logger(name=None):
    """
    Gibt einen konfigurierten Logger zurück
    """
    return setup_logger(name) 