import os
import json
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional

from pydantic import BaseModel
from .mistral_service import MistralService, ChatMessage

logger = logging.getLogger(__name__)

class NexusRequest(BaseModel):
    query: str
    context: Optional[str] = None
    goals: Optional[List[str]] = None
    max_tokens: Optional[int] = 3000

class NexusResponse(BaseModel):
    solution: str
    steps: List[str]
    references: Optional[List[str]] = None
    model: str
    token_count: Optional[int] = None
    processing_time: Optional[float] = None

class NexusService:
    """
    NexusService verarbeitet Anfragen für Analysen und Lösungsgenerierungen,
    indem es mit dem MistralService kommuniziert und Ergebnisse aufbereitet.
    """
    
    def __init__(self, mistral_service: MistralService):
        self.mistral_service = mistral_service
        self.templates_path = os.path.join(os.path.dirname(__file__), "../templates/nexus_templates.json")
        self.templates = self._load_templates()
        logger.info("NexusService initialisiert")
    
    def _load_templates(self) -> Dict[str, str]:
        """Lädt Template-Texte aus einer JSON-Datei"""
        try:
            if os.path.exists(self.templates_path):
                with open(self.templates_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                logger.warning(f"Templates-Datei nicht gefunden: {self.templates_path}")
                return self._get_default_templates()
        except Exception as e:
            logger.error(f"Fehler beim Laden der Templates: {str(e)}")
            return self._get_default_templates()
    
    def _get_default_templates(self) -> Dict[str, str]:
        """Liefert Standard-Templates zurück, falls keine Datei geladen werden kann"""
        return {
            "solution_system_prompt": "Du bist The Nexus, eine hochspezialisierte KI für komplexe Problemlösungen. Deine Aufgabe ist es, strukturierte und durchdachte Lösungen zu generieren, die sowohl theoretisch fundiert als auch praktisch umsetzbar sind. Verwende Markdown für eine klare Formatierung.",
            
            "analysis_system_prompt": "Du bist The Nexus, eine hochspezialisierte KI für tiefgehende Analysen. Deine Aufgabe ist es, komplexe Probleme zu analysieren, in ihre Bestandteile zu zerlegen und strukturierte Einsichten zu liefern. Verwende Markdown für eine klare Formatierung.",
            
            "solution_prompt": """# Anfrage zur Lösungsgenerierung

## Problem
{query}

{context_section}

{goals_section}

Generiere eine durchdachte, strukturierte Lösung für dieses Problem. Die Lösung sollte:
1. Das Problem präzise analysieren
2. Eine klare Strategie entwickeln
3. Konkrete Schritte zur Umsetzung vorschlagen
4. Falls möglich, Code-Beispiele oder Diagramme enthalten
5. Risiken und Alternativen berücksichtigen

Strukturiere deine Antwort mit Markdown für bessere Lesbarkeit.""",
            
            "analysis_prompt": """# Anfrage zur Problemanalyse

## Zu analysierendes Problem
{query}

{context_section}

Führe eine tiefgehende, strukturierte Analyse des Problems durch. Deine Analyse sollte:
1. Das Problem in seine Kernbestandteile zerlegen
2. Zugrunde liegende Ursachen identifizieren
3. Verschiedene Perspektiven berücksichtigen
4. Zusammenhänge und Wechselwirkungen aufzeigen
5. Eine evidenzbasierte Bewertung vornehmen

Strukturiere deine Antwort mit Markdown für bessere Lesbarkeit."""
        }
    
    def get_template(self, template_name: str, **kwargs) -> str:
        """Holt ein Template und füllt es mit den übergebenen Werten aus"""
        template = self.templates.get(template_name, "")
        if not template:
            logger.warning(f"Template '{template_name}' nicht gefunden")
            return ""
        
        # Kontext und Ziele formatieren, falls vorhanden
        context_section = ""
        if kwargs.get("context"):
            context_section = f"## Kontext\n{kwargs['context']}\n\n"
        
        goals_section = ""
        if kwargs.get("goals") and isinstance(kwargs["goals"], list) and len(kwargs["goals"]) > 0:
            goals_section = "## Ziele\n" + "\n".join([f"- {goal}" for goal in kwargs["goals"]]) + "\n\n"
        
        # Template mit Werten ausfüllen
        return template.format(
            query=kwargs.get("query", ""),
            context_section=context_section,
            goals_section=goals_section,
            **{k: v for k, v in kwargs.items() if k not in ["query", "context_section", "goals_section"]}
        )
    
    async def generate_solution(self, request: NexusRequest) -> NexusResponse:
        """
        Generiert eine Lösung basierend auf der Anfrage, dem Kontext und den Zielen
        """
        start_time = time.time()
        logger.info(f"Lösungsgenerierung gestartet für: {request.query[:50]}...")
        
        try:
            # System Prompt und Haupt-Prompt vorbereiten
            system_prompt = self.templates.get("solution_system_prompt", "")
            main_prompt = self.get_template(
                "solution_prompt", 
                query=request.query,
                context=request.context,
                goals=request.goals
            )
            
            # Anfrage an Mistral senden
            messages = [
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=main_prompt)
            ]
            
            chat_request = {
                "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
                "temperature": 0.7,
                "max_tokens": request.max_tokens or 3000
            }
            
            response = await self.mistral_service.chat_completion(**chat_request)
            
            # Verarbeitungszeit berechnen
            processing_time = time.time() - start_time
            
            # Schritte extrahieren (einfache Heuristik: Überschriften mit # oder ##)
            solution_text = response["choices"][0]["message"]["content"]
            steps = self._extract_steps(solution_text)
            
            # Token-Zählung aus der Antwort extrahieren
            token_count = response.get("usage", {}).get("total_tokens", None)
            
            return NexusResponse(
                solution=solution_text,
                steps=steps,
                model=response.get("model", "mistral"),
                token_count=token_count,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Fehler bei der Lösungsgenerierung: {str(e)}")
            raise
    
    async def analyze_problem(self, request: NexusRequest) -> NexusResponse:
        """
        Analysiert ein Problem basierend auf der Anfrage und dem Kontext
        """
        start_time = time.time()
        logger.info(f"Problemanalyse gestartet für: {request.query[:50]}...")
        
        try:
            # System Prompt und Haupt-Prompt vorbereiten
            system_prompt = self.templates.get("analysis_system_prompt", "")
            main_prompt = self.get_template(
                "analysis_prompt", 
                query=request.query,
                context=request.context
            )
            
            # Anfrage an Mistral senden
            messages = [
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=main_prompt)
            ]
            
            chat_request = {
                "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
                "temperature": 0.7,
                "max_tokens": request.max_tokens or 3000
            }
            
            response = await self.mistral_service.chat_completion(**chat_request)
            
            # Verarbeitungszeit berechnen
            processing_time = time.time() - start_time
            
            # Analyse-Ergebnis und Schritte extrahieren
            analysis_text = response["choices"][0]["message"]["content"]
            steps = self._extract_steps(analysis_text)
            
            # Token-Zählung aus der Antwort extrahieren
            token_count = response.get("usage", {}).get("total_tokens", None)
            
            return NexusResponse(
                solution=analysis_text,
                steps=steps,
                model=response.get("model", "mistral"),
                token_count=token_count,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Fehler bei der Problemanalyse: {str(e)}")
            raise
    
    def _extract_steps(self, text: str) -> List[str]:
        """Extrahiert Schritte aus dem generierten Text (basierend auf Überschriften und Listen)"""
        steps = []
        
        # Markdown-Überschriften extrahieren
        heading_patterns = [
            r'^#+\s+(.*?)$',  # Überschriften (# Überschrift)
            r'^(\d+\.\s+.*?)$',  # Nummerierte Listen (1. Schritt)
            r'^[-*]\s+(.*?)$'  # Aufzählungslisten (- Schritt)
        ]
        
        for line in text.split('\n'):
            line = line.strip()
            for pattern in heading_patterns:
                import re
                match = re.match(pattern, line)
                if match:
                    step_text = match.group(1).strip()
                    # Nur sinnvolle Schritte hinzufügen (mindestens 3 Zeichen, nicht "Einleitung", etc.)
                    if len(step_text) > 3 and step_text not in ["Einleitung", "Fazit", "Zusammenfassung", "Übersicht"]:
                        steps.append(step_text)
        
        # Wenn keine Schritte gefunden wurden, Standard-Schritte zurückgeben
        if not steps:
            if "Analyse" in text[:100]:
                steps = ["Problemanalyse", "Kontextuelle Einordnung", "Dimensionale Bewertung", "Schlussfolgerung"]
            else:
                steps = ["Problemdefinition", "Lösungsstrategie", "Umsetzungsschritte", "Ergebnisvalidierung"]
        
        # Auf maximal 10 Schritte begrenzen, um die UI nicht zu überladen
        return steps[:10]
    
    async def is_available(self) -> bool:
        """Überprüft, ob der Mistral-Service verfügbar ist"""
        try:
            return await self.mistral_service.is_available()
        except Exception as e:
            logger.error(f"Fehler bei der Verfügbarkeitsprüfung: {str(e)}")
            return False

    # Demo-Funktionen für Tests ohne Mistral-API
    
    async def generate_demo_solution(self, request: NexusRequest) -> NexusResponse:
        """Generiert eine Demo-Lösung ohne Backend-Verbindung"""
        await asyncio.sleep(2)  # Simulation der Verarbeitungszeit
        
        solution_text = f"""
# Lösungsvorschlag für: {request.query}

## Analyse des Problems
{request.query} stellt ein komplexes Problem dar, das mehrere Facetten hat:
1. Die Hauptherausforderung liegt in der Strukturierung und Organisation der Daten
2. Es gibt verschiedene Stakeholder mit unterschiedlichen Interessen
3. Die Skalierbarkeit der Lösung muss berücksichtigt werden

## Empfohlene Lösung
Eine mehrstufige Strategie ist hier am sinnvollsten:

1. Zunächst sollten die Anforderungen klar definiert werden
2. Die Datenstrukturen müssen entsprechend modelliert werden
3. Ein iterativer Entwicklungsprozess ermöglicht kontinuierliches Feedback
4. Automatisierte Tests sichern die Qualität
5. Dokumentation für alle Beteiligten erstellen

## Technische Umsetzung
```python
# Beispiel-Implementierung eines zentralen Datenmodells
class SolutionModel:
    def __init__(self, id, title, steps):
        self.id = id
        self.title = title
        self.steps = steps
```

## Nächste Schritte
1. Erstellen eines Prototyps
2. Sammeln von Feedback
3. Iterative Verbesserung
4. Ausrollen der Lösung
        """
        
        steps = [
            "Problem analysieren",
            "Strategie entwickeln",
            "Technische Lösung implementieren",
            "Qualitätssicherung durchführen",
            "Dokumentation erstellen",
        ]
        
        return NexusResponse(
            solution=solution_text,
            steps=steps,
            model="Mistral 7B (Demo)",
            processing_time=1.5,
            token_count=750,
        )
    
    async def generate_demo_analysis(self, request: NexusRequest) -> NexusResponse:
        """Generiert eine Demo-Analyse ohne Backend-Verbindung"""
        await asyncio.sleep(2)  # Simulation der Verarbeitungszeit
        
        analysis_text = f"""
# Strukturierte Analyse von: {request.query}

## Zerlegung des Problems
1. **Kernaspekte**:
   - Hauptfragestellung: {request.query.split('.')[0]}
   - Komplexitätsgrad: Mittel bis hoch
   - Domänenspezifisches Wissen erforderlich: Ja

2. **Kontextuelle Faktoren**:
   {f"- Berücksichtigter Kontext: {request.context}" if request.context else "- Kein spezifischer Kontext angegeben"}
   - Relevante Einflussfaktoren: Technologie, Marktbedingungen, Ressourcenverfügbarkeit

## Hauptkomponenten der Analyse
1. **Technische Dimension**:
   - Erforderliche Technologien: Cloud-Infrastruktur, Datenbanksysteme, API-Management
   - Skalierbarkeitsanforderungen: Hoch
   - Integration mit bestehenden Systemen: Mittlerer Komplexitätsgrad

2. **Organisatorische Dimension**:
   - Stakeholder-Management: 5-7 Hauptbeteiligte
   - Change-Management-Bedarf: Signifikant
   - Schulungsbedarf: Moderat

3. **Wirtschaftliche Dimension**:
   - Investitionsbedarf: Mittel bis hoch
   - ROI-Zeitrahmen: 18-24 Monate
   - Risikofaktoren: Technologische Veralterung, Marktveränderungen

## Handlungsempfehlungen
1. Detaillierte Anforderungsanalyse durchführen
2. Proof-of-Concept für kritische Komponenten entwickeln
3. Stakeholder-Workshop zur Validierung der Anforderungen organisieren
4. Risikomanagement-Plan erstellen
5. Iterativen Implementierungsplan mit Meilensteinen entwickeln
        """
        
        steps = [
            "Problemzerlegung",
            "Kontextanalyse",
            "Dimensionale Bewertung",
            "Handlungsempfehlungen",
            "Entscheidungsmatrix",
        ]
        
        return NexusResponse(
            solution=analysis_text,
            steps=steps,
            model="Mistral 7B (Demo)",
            processing_time=1.8,
            token_count=820,
        ) 