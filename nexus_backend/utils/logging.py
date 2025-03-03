"""
Logging-Modul für das Nexus-Backend.
Konfiguriert einheitliches Logging für verschiedene Komponenten.
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
import json
from datetime import datetime
from functools import lru_cache

from ..config import get_settings

settings = get_settings()

# Sicherstellen, dass das Log-Verzeichnis existiert
os.makedirs("logs", exist_ok=True)


class JsonFormatter(logging.Formatter):
    """Formatiert Log-Einträge als JSON für bessere Maschinenlesbarkeit."""
    
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "module": record.module,
            "message": record.getMessage(),
        }
        
        # Exception-Informationen hinzufügen, falls vorhanden
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        
        # Zusätzliche Felder aus dem Log-Record hinzufügen
        for key, value in record.__dict__.items():
            if key not in ["args", "asctime", "created", "exc_info", "exc_text", "filename",
                           "funcName", "id", "levelname", "levelno", "lineno", "module",
                           "msecs", "message", "msg", "name", "pathname", "process",
                           "processName", "relativeCreated", "stack_info", "thread", "threadName"]:
                log_record[key] = value
        
        return json.dumps(log_record, ensure_ascii=False)


@lru_cache()
def get_logger(name: str) -> logging.Logger:
    """
    Erstellt und konfiguriert einen Logger für das angegebene Modul.
    
    Args:
        name: Name des Moduls, für das der Logger erstellt werden soll
        
    Returns:
        Konfigurierter Logger
    """
    logger = logging.getLogger(name)
    
    # Logger nur einmal konfigurieren
    if logger.handlers:
        return logger
    
    # Log-Level aus Konfiguration übernehmen
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Formatierung
    standard_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(module)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    json_formatter = JsonFormatter()
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(standard_formatter)
    logger.addHandler(console_handler)
    
    # File Handler (rotierend)
    file_handler = RotatingFileHandler(
        os.path.join("logs", settings.log_file),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )
    file_handler.setFormatter(json_formatter)
    logger.addHandler(file_handler)
    
    # JSON Log-Datei für strukturierte Logs
    json_file_handler = RotatingFileHandler(
        os.path.join("logs", f"{os.path.splitext(settings.log_file)[0]}.json"),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )
    json_file_handler.setFormatter(json_formatter)
    logger.addHandler(json_file_handler)
    
    return logger


# Logger für das Root-Modul erstellen
logger = get_logger("nexus_backend") 