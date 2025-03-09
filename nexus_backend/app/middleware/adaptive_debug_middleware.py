"""
Middleware für adaptives Debugging in der FastAPI-Anwendung.

Integriert das selbstlernende Debugging-System in die HTTP-Request-Verarbeitung.
"""

import time
import sys
import traceback
from typing import Dict, List, Any, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ...utils.adaptive_debug import (
    debugger, RootCauseAnalyzer, SelfHealingCode, get_debug_report
)
from ...utils.logging import get_logger

logger = get_logger("adaptive_debug_middleware")


class AdaptiveDebugMiddleware(BaseHTTPMiddleware):
    """Middleware zur Integration des adaptiven Debugging-Systems in FastAPI."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rca = RootCauseAnalyzer()
        self.self_healing = SelfHealingCode()
        self.routes_timing: Dict[str, Dict[str, float]] = {}
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """Verarbeitet eingehende Requests und überwacht die Ausführung."""
        # Erfasse Start-Zeit für Performance-Messung
        start_time = time.time()
        
        # Extrahiere Endpunktinformationen für bessere Fehlerzuordnung
        path = request.url.path
        method = request.method
        route_key = f"{method}:{path}"
        
        # Response-Objekt für Fehlerbehandlung
        response = None
        
        try:
            # Führe die Anfrage aus
            response = await call_next(request)
            
            # Erfasse Ende und berechne Ausführungszeit
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Speichere Timing-Informationen für Performance-Analyse
            if route_key not in self.routes_timing:
                self.routes_timing[route_key] = {
                    "count": 0,
                    "total_time": 0,
                    "min_time": float('inf'),
                    "max_time": 0,
                    "avg_time": 0
                }
                
            stats = self.routes_timing[route_key]
            stats["count"] += 1
            stats["total_time"] += execution_time
            stats["min_time"] = min(stats["min_time"], execution_time)
            stats["max_time"] = max(stats["max_time"], execution_time)
            stats["avg_time"] = stats["total_time"] / stats["count"]
            
            # Logge langsame Routen für Performance-Optimierung
            if execution_time > 1.0:  # Über 1 Sekunde
                logger.warning(
                    f"Langsame Route: {route_key} dauerte {execution_time:.2f}s "
                    f"(Durchschnitt: {stats['avg_time']:.2f}s)"
                )
            
            return response
            
        except Exception as e:
            # Erfasse Exception-Informationen für Analyse
            exc_info = sys.exc_info()
            
            # Analysiere den Fehler
            error_id = self.rca.analyze_exception(exc_info, f"route:{route_key}")
            
            logger.error(
                f"Fehler bei Route {route_key}: {e}",
                extra={"error_id": error_id, "route": route_key}
            )
            
            # Versuche automatischen Fix (für die Zukunft, aktueller Request ist bereits fehlgeschlagen)
            fix_result = self.self_healing.try_auto_fix(error_id)
            
            if fix_result:
                logger.info(f"Automatischer Fix für Route {route_key} registriert.")
            
            # Wirf die ursprüngliche Exception weiter, um standardmäßige Fehlerbehandlung zu ermöglichen
            raise
            
        finally:
            # Hier könnten weitere Clean-up-Operationen stattfinden
            pass


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware zur Erfassung von Request-Kontext für bessere Fehlerdiagnose."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """Erfasst Kontext für eingehende Requests."""
        # Extrahiere wichtige Request-Daten für Diagnosezwecke
        headers = dict(request.headers)
        path = request.url.path
        query_params = dict(request.query_params)
        
        # Sichere Header-Behandlung (entferne sensible Informationen)
        if "authorization" in headers:
            headers["authorization"] = "REDACTED"
        if "cookie" in headers:
            headers["cookie"] = "REDACTED"
            
        # Logge Request-Informationen im Debug-Modus
        logger.debug(
            f"Eingehender Request: {request.method} {path}",
            extra={
                "path": path,
                "method": request.method,
                "query_params": query_params,
                "headers": headers
            }
        )
        
        # Request ausführen und zurückgeben
        response = await call_next(request)
        
        # Logge Antwort-Informationen im Debug-Modus
        logger.debug(
            f"Ausgehende Antwort: {response.status_code}",
            extra={
                "path": path,
                "method": request.method,
                "status_code": response.status_code
            }
        )
        
        return response 