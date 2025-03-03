from .mistral_service import MistralService
from .nexus_service import NexusService

# Singleton-Instanzen der Services
mistral_service = MistralService()
nexus_service = NexusService(mistral_service)

def get_mistral_service():
    return mistral_service

def get_nexus_service():
    return nexus_service 