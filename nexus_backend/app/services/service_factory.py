from .nexus_service import NexusService

# Singleton-Instanzen
nexus_service = NexusService()

def get_nexus_service():
    """Liefert die Singleton-Instanz des NexusService zurück"""
    return nexus_service 