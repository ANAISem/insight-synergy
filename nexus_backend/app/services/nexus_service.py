import os
import json
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional
import aiohttp

from pydantic import BaseModel

from .api_client import APIClient
from ..core.api_config import api_config

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
    facts_found: Optional[bool] = None
    model_used: Optional[str] = None  # Speichert das tatsächlich verwendete Modell für Monitoring

class ChatMessage(BaseModel):
    role: str
    content: str

class NexusService:
    """
    NexusService verarbeitet Anfragen für Analysen und Lösungsgenerierungen
    über eine API-basierte Implementierung mit Perplexity und OpenAI-Modellen (o1 mini, 4o mini),
    sowie Insight Synergy Core als Fallback.
    """
    
    def __init__(self):
        self.templates_path = os.path.join(os.path.dirname(__file__), "../templates/nexus_templates.json")
        self.templates = self._load_templates()
        self.api_client = APIClient()
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
        Generate a solution based on the request.
        Fallback-Reihe: 
        1. Perplexity
        2. O1 mini
        3. 4o-mini
        4. Insight Core (Reserve)
        """
        try:
            # Erster Versuch: Perplexity
            return await self._generate_with_perplexity(request)
        except Exception as e:
            logger.warning(f"Perplexity API failed: {str(e)}. Falling back to O1 mini.")
            
            try:
                # Zweiter Versuch: O1 mini
                return await self._generate_with_o1_mini(request)
            except Exception as e:
                logger.warning(f"O1 mini API failed: {str(e)}. Falling back to 4o-mini.")
                
                try:
                    # Dritter Versuch: 4o-mini
                    return await self._generate_with_4o_mini(request)
                except Exception as e:
                    logger.warning(f"4o-mini API failed: {str(e)}. Falling back to Insight Core.")
                    
                    # Letzter Fallback: Insight Core
                    return await self._generate_with_insight_core(request)
    
    async def analyze_problem(self, request: NexusRequest) -> NexusResponse:
        """
        Analyze a problem based on the request.
        Fallback-Reihe: 
        1. Perplexity
        2. O1 mini
        3. 4o-mini
        4. Insight Core (Reserve)
        """
        try:
            # Erster Versuch: Perplexity
            return await self._analyze_with_perplexity(request)
        except Exception as e:
            logger.warning(f"Perplexity API failed: {str(e)}. Falling back to O1 mini.")
            
            try:
                # Zweiter Versuch: O1 mini
                return await self._analyze_with_o1_mini(request)
            except Exception as e:
                logger.warning(f"O1 mini API failed: {str(e)}. Falling back to 4o-mini.")
                
                try:
                    # Dritter Versuch: 4o-mini
                    return await self._analyze_with_4o_mini(request)
                except Exception as e:
                    logger.warning(f"4o-mini API failed: {str(e)}. Falling back to Insight Core.")
                    
                    # Letzter Fallback: Insight Core
                    return await self._analyze_with_insight_core(request)
    
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
        
        return steps

    async def is_available(self) -> bool:
        """Prüft, ob der Service verfügbar ist"""
        try:
            # Teste eine einfache Anfrage
            test_query = "Test der API-Verfügbarkeit"
            response = await self.api_client.generate_answer(test_query)
            return response is not None
        except Exception as e:
            logger.error(f"Service nicht verfügbar: {str(e)}")
            return False
            
    async def get_service_status(self) -> Dict[str, Any]:
        """Gibt detaillierte Statusinformationen über verfügbare Modelle zurück"""
        status = {
            "online": False,
            "perplexity_available": False,
            "primary_model_available": False,
            "fallback_model_available": False,
            "is_core_available": False,
            "models": {
                "primary": api_config.PRIMARY_MODEL,
                "fallback": api_config.FALLBACK_MODEL,
                "is_core": "insight-synergy-core" if api_config.IS_CORE_ENABLED else None
            }
        }
        
        try:
            # Teste Perplexity API
            if api_config.PERPLEXITY_API_KEY:
                test_query = "Test der API-Verfügbarkeit"
                facts = await self.api_client.fetch_facts(test_query)
                status["perplexity_available"] = facts is not None
            
            # Teste primäres Modell (o1 mini)
            if api_config.OPENAI_API_KEY:
                test_query = "Kurzer Test"
                response = await self.api_client._generate_openai_answer(
                    test_query, 
                    model=api_config.PRIMARY_MODEL
                )
                status["primary_model_available"] = response is not None
            
            # Teste Fallback-Modell (4o mini)
            if api_config.OPENAI_API_KEY and api_config.ENABLE_MODEL_FALLBACK:
                test_query = "Kurzer Test"
                response = await self.api_client._generate_openai_answer(
                    test_query, 
                    model=api_config.FALLBACK_MODEL
                )
                status["fallback_model_available"] = response is not None
            
            # Teste IS Core
            if api_config.IS_CORE_ENABLED and api_config.ENABLE_INSIGHT_CORE_FALLBACK:
                test_query = "Kurzer Test"
                response = await self.api_client._generate_is_core_answer(test_query)
                status["is_core_available"] = response is not None
            
            # System ist online, wenn mindestens ein Modell verfügbar ist
            status["online"] = (
                status["primary_model_available"] or 
                status["fallback_model_available"] or 
                status["is_core_available"]
            )
            
            return status
        except Exception as e:
            logger.error(f"Fehler bei der Statusabfrage: {str(e)}")
            return status

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

    async def _generate_with_perplexity(self, request: NexusRequest) -> NexusResponse:
        """Generate a solution using Perplexity API."""
        from openai import OpenAI
        import os
        import time
        
        start_time = time.time()
        
        try:
            api_key = os.getenv("PERPLEXITY_API_KEY")
            if not api_key:
                raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
            
            # Erstellen des Clients mit der Perplexity-Basis-URL
            client = OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
            
            # Erstellen der Nachrichten für die Anfrage
            system_message = self.get_template("solution_prompt", {
                "goals": request.goals or "Provide a comprehensive solution",
                "details": request.context or ""
            })
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.query}
            ]
            
            # API-Aufruf
            response = client.chat.completions.create(
                model="llama-3-sonar-large-32k-online",
                messages=messages,
                temperature=0.7,
                max_tokens=request.max_tokens or 2000
            )
            
            # Verarbeiten der Antwort
            solution_text = response.choices[0].message.content
            steps = self._extract_steps(solution_text)
            
            # Prüfen auf Zitate, falls vorhanden
            references = []
            if hasattr(response, 'citations') and response.citations:
                references = [{"text": citation.text, "url": citation.url} 
                             for citation in response.citations]
            
            processing_time = time.time() - start_time
            
            return NexusResponse(
                solution=solution_text,
                steps=steps,
                references=references,
                model="perplexity-llama-3-sonar-large-32k",
                token_count=response.usage.total_tokens,
                processing_time=processing_time,
                facts_found=len(references) > 0,
                model_used="Perplexity"
            )
        
        except Exception as e:
            logger.error(f"Error with Perplexity API: {str(e)}")
            raise 

    async def _generate_with_o1_mini(self, request: NexusRequest) -> NexusResponse:
        """Generate a solution using O1 mini API."""
        from openai import OpenAI
        import os
        import time
        
        start_time = time.time()
        
        try:
            api_key = os.getenv("O1_MINI_API_KEY")
            if not api_key:
                raise ValueError("O1_MINI_API_KEY not found in environment variables")
            
            # OpenAI-Client für O1 mini
            client = OpenAI(api_key=api_key)
            
            # Erstellen der Nachrichten für die Anfrage
            system_message = self.get_template("solution_prompt", {
                "goals": request.goals or "Provide a comprehensive solution",
                "details": request.context or ""
            })
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.query}
            ]
            
            # API-Aufruf (angepasst für O1 mini)
            response = client.chat.completions.create(
                model="o1-mini",  # O1 mini model
                messages=messages,
                temperature=0.7,
                max_tokens=request.max_tokens or 2000
            )
            
            # Verarbeiten der Antwort
            solution_text = response.choices[0].message.content
            steps = self._extract_steps(solution_text)
            
            processing_time = time.time() - start_time
            
            return NexusResponse(
                solution=solution_text,
                steps=steps,
                references=[],  # O1 mini unterstützt keine Referenzen/Zitate
                model="o1-mini",
                token_count=response.usage.total_tokens,
                processing_time=processing_time,
                facts_found=False,
                model_used="O1 mini"
            )
        
        except Exception as e:
            logger.error(f"Error with O1 mini API: {str(e)}")
            raise 

    async def _generate_with_4o_mini(self, request: NexusRequest) -> NexusResponse:
        """Generate a solution using 4o-mini API."""
        from openai import OpenAI
        import os
        import time
        
        start_time = time.time()
        
        try:
            api_key = os.getenv("FOUR_O_MINI_API_KEY")
            if not api_key:
                raise ValueError("FOUR_O_MINI_API_KEY not found in environment variables")
            
            # OpenAI-Client für 4o-mini
            client = OpenAI(api_key=api_key)
            
            # Erstellen der Nachrichten für die Anfrage
            system_message = self.get_template("solution_prompt", {
                "goals": request.goals or "Provide a comprehensive solution",
                "details": request.context or ""
            })
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.query}
            ]
            
            # API-Aufruf (angepasst für 4o-mini)
            response = client.chat.completions.create(
                model="4o-mini",  # 4o-mini model
                messages=messages,
                temperature=0.7,
                max_tokens=request.max_tokens or 2000
            )
            
            # Verarbeiten der Antwort
            solution_text = response.choices[0].message.content
            steps = self._extract_steps(solution_text)
            
            processing_time = time.time() - start_time
            
            return NexusResponse(
                solution=solution_text,
                steps=steps,
                references=[],  # 4o-mini unterstützt keine Referenzen/Zitate
                model="4o-mini",
                token_count=response.usage.total_tokens,
                processing_time=processing_time,
                facts_found=False,
                model_used="4o mini"
            )
        
        except Exception as e:
            logger.error(f"Error with 4o-mini API: {str(e)}")
            raise 

    async def _analyze_with_perplexity(self, request: NexusRequest) -> NexusResponse:
        """Analyze a problem using Perplexity API."""
        from openai import OpenAI
        import os
        import time
        
        start_time = time.time()
        
        try:
            api_key = os.getenv("PERPLEXITY_API_KEY")
            if not api_key:
                raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
            
            # Erstellen des Clients mit der Perplexity-Basis-URL
            client = OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
            
            # Erstellen der Nachrichten für die Anfrage
            system_message = self.get_template("analysis_prompt", {
                "goals": request.goals or "Provide a comprehensive analysis",
                "details": request.context or ""
            })
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.query}
            ]
            
            # API-Aufruf
            response = client.chat.completions.create(
                model="llama-3-sonar-large-32k-online",
                messages=messages,
                temperature=0.7,
                max_tokens=request.max_tokens or 2000
            )
            
            # Verarbeiten der Antwort
            analysis_text = response.choices[0].message.content
            steps = self._extract_steps(analysis_text)
            
            # Prüfen auf Zitate, falls vorhanden
            references = []
            if hasattr(response, 'citations') and response.citations:
                references = [{"text": citation.text, "url": citation.url} 
                             for citation in response.citations]
            
            processing_time = time.time() - start_time
            
            return NexusResponse(
                solution=analysis_text,
                steps=steps,
                references=references,
                model="perplexity-llama-3-sonar-large-32k",
                token_count=response.usage.total_tokens,
                processing_time=processing_time,
                facts_found=len(references) > 0,
                model_used="Perplexity"
            )
        
        except Exception as e:
            logger.error(f"Error with Perplexity API: {str(e)}")
            raise 