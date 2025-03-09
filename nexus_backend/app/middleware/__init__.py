"""
Middleware-Komponenten für Nexus Backend.

Enthält Middleware für verschiedene Aspekte der Anwendung,
insbesondere für das adaptive Debugging-System.
"""

from .adaptive_debug_middleware import AdaptiveDebugMiddleware, RequestContextMiddleware

__all__ = ["AdaptiveDebugMiddleware", "RequestContextMiddleware"] 