"""
Direkte Implementierung der Experten-Profile-Endpunkte für Insight Synergy.

Diese Datei enthält einfache Implementierungen, die statische Daten zurückgeben,
um die Frontend-Anwendung zu unterstützen.
"""

from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
import random

# Router für Experten-Profile-Endpunkte
profiles_router = APIRouter()

# Vordefinierte Expertenprofile
EXPERT_PROFILES = [
    {
        "id": "exp-001",
        "name": "Dr. Tech Visionary",
        "domain": "Technologie",
        "specialty": "KI-Entwicklung & Zukunftstechnologien",
        "background": "Führender Forscher im Bereich künstliche Intelligenz mit Schwerpunkt auf ethischen Implikationen.",
        "perspective": "Techno-optimistisch, aber mit kritischem Blick auf gesellschaftliche Auswirkungen",
        "avatar": "🧠",
        "color": "#6366f1",
        "expertise": 95,
        "validatedCredentials": True
    },
    {
        "id": "exp-002",
        "name": "Prof. EcoThinker",
        "domain": "Umweltwissenschaften",
        "specialty": "Klimawandel & Nachhaltige Entwicklung",
        "background": "Langjährige Forschung zu Umweltauswirkungen verschiedener Technologien und Wirtschaftsmodelle.",
        "perspective": "Fokus auf langfristige ökologische Nachhaltigkeit und Systemwandel",
        "avatar": "🌍",
        "color": "#22c55e",
        "expertise": 92,
        "validatedCredentials": True
    },
    {
        "id": "exp-003",
        "name": "FinExpert",
        "domain": "Wirtschaft",
        "specialty": "Finanzmarkt & Investitionsanalyse",
        "background": "Jahrzehnte an Erfahrung in der Analyse globaler Märkte und wirtschaftlicher Trends.",
        "perspective": "Pragmatisch, datengetrieben mit Fokus auf wirtschaftlichen Mehrwert",
        "avatar": "📊",
        "color": "#eab308",
        "expertise": 88,
        "validatedCredentials": True
    },
    {
        "id": "exp-004",
        "name": "Ethics Specialist",
        "domain": "Philosophie & Ethik",
        "specialty": "Angewandte Ethik & soziale Gerechtigkeit",
        "background": "Forschung zu ethischen Fragen neuer Technologien und deren gesellschaftlichen Implikationen.",
        "perspective": "Stellt kritische Fragen zu Fairness, Zugänglichkeit und langfristigen Konsequenzen",
        "avatar": "⚖️",
        "color": "#8b5cf6",
        "expertise": 90,
        "validatedCredentials": True
    },
    {
        "id": "exp-005",
        "name": "Policy Advisor",
        "domain": "Politik & Regulierung",
        "specialty": "Internationale Richtlinien & Gesetzgebung",
        "background": "Beratung für Regierungen und internationale Organisationen zu Regulierungsfragen.",
        "perspective": "Fokus auf praktische Umsetzbarkeit und regulatorische Herausforderungen",
        "avatar": "📝",
        "color": "#0ea5e9",
        "expertise": 87,
        "validatedCredentials": True
    },
    {
        "id": "exp-006",
        "name": "Dr. Medicine Insights",
        "domain": "Medizin",
        "specialty": "Medizinische Ethik & Gesundheitssystemforschung",
        "background": "Forschung und Praxis an der Schnittstelle zwischen medizinischer Innovation und ethischen Fragen.",
        "perspective": "Patientenzentrierter Ansatz mit Fokus auf gerechten Zugang zu Gesundheitsversorgung",
        "avatar": "🏥",
        "color": "#ec4899",
        "expertise": 93,
        "validatedCredentials": True
    },
    {
        "id": "exp-007",
        "name": "Tech Ethicist",
        "domain": "Technologieethik",
        "specialty": "KI-Ethik & Verantwortungsvolle Innovation",
        "background": "Forschung zur ethischen Entwicklung und Anwendung von KI in verschiedenen Bereichen.",
        "perspective": "Fokus auf menschenzentrierte Technologieentwicklung und ethische Leitplanken",
        "avatar": "🤖",
        "color": "#3b82f6",
        "expertise": 96,
        "validatedCredentials": True
    }
]

@profiles_router.get("/profiles")
async def get_expert_profiles():
    """Gibt eine Liste vordefinierter Expertenprofile zurück."""
    return {
        "experts": EXPERT_PROFILES,
        "count": len(EXPERT_PROFILES)
    }

@profiles_router.get("/suggested")
async def get_suggested_experts(
    topic: str = Query(..., description="Das Thema, für das Experten vorgeschlagen werden sollen"),
    count: int = Query(3, description="Anzahl der gewünschten Experten")
):
    """Schlägt geeignete Experten für ein bestimmtes Thema vor."""
    # Für diese Implementierung wählen wir einfach zufällig `count` Experten aus
    suggested_experts = random.sample(EXPERT_PROFILES, min(count, len(EXPERT_PROFILES)))
    
    return {
        "topic": topic,
        "experts": suggested_experts,
        "count": len(suggested_experts)
    } 