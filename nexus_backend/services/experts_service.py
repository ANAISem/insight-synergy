"""
Multi-Experten-Service für die Cognitive Loop AI.

Dieser Service verwaltet und koordiniert ein Team virtueller Experten,
die verschiedene Perspektiven in Diskussionen einbringen können.
"""

import uuid
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..db.vector_db import VectorDB
from ..services.llm_service import LLMService
from ..models.schemas import (
    ExpertProfile,
    DiscussionMessage,
    Discussion,
    BiasDetectionResult
)


logger = logging.getLogger(__name__)


class ExpertsService:
    """
    Service zur Verwaltung und Koordination eines Teams virtueller Experten.
    
    Diese Klasse enthält Funktionen für die Initialisierung, Anpassung und Steuerung
    virtueller Experten, die in einer Diskussion verschiedene Perspektiven einbringen.
    """
    
    def __init__(self, llm_service: LLMService, vector_db: VectorDB):
        """
        Initialisiert den ExpertsService mit den erforderlichen Abhängigkeiten.
        
        Args:
            llm_service: LLM-Service für die Generierung von Expertenantworten
            vector_db: Vector-DB für den Zugriff auf das Wissen
        """
        self.llm_service = llm_service
        self.vector_db = vector_db
        
        # Standardexperten initialisieren
        self.default_experts = self._initialize_default_experts()
        
        # Aktuell aktive Experten in Diskussionen
        self.active_experts: Dict[str, Dict[str, Any]] = {}
        
        logger.info("ExpertsService wurde initialisiert")
    
    def _initialize_default_experts(self) -> Dict[str, ExpertProfile]:
        """
        Initialisiert eine Sammlung von Standard-Experten mit vordefinierten Profilen.
        
        Returns:
            Dict von Experten-IDs zu ExpertProfile-Objekten
        """
        experts = {}
        
        # Technologie-Experte
        tech_expert = ExpertProfile(
            id="tech-expert",
            name="TechAnalyst",
            expertise_area="Technologie",
            description="Spezialist für moderne Technologietrends und -entwicklungen mit "
                        "Fokus auf KI, Quantencomputing und Digitalisierung.",
            bias_profile={
                "tech_optimism": 0.7,
                "risk_aversion": 0.3,
                "innovation_bias": 0.8,
                "status_quo_bias": 0.2
            },
            confidence_level=0.85,
            avatar_url="https://example.com/avatars/tech_expert.png"
        )
        experts[tech_expert.id] = tech_expert
        
        # Wirtschafts-Experte
        econ_expert = ExpertProfile(
            id="econ-expert",
            name="EconInsight",
            expertise_area="Wirtschaft",
            description="Wirtschaftsanalyst mit Schwerpunkt auf Markttrends, Unternehmensstrategien "
                        "und wirtschaftlichen Auswirkungen technologischer Entwicklungen.",
            bias_profile={
                "market_focus": 0.8,
                "profit_orientation": 0.7,
                "risk_aversion": 0.6,
                "tech_optimism": 0.5
            },
            confidence_level=0.82,
            avatar_url="https://example.com/avatars/econ_expert.png"
        )
        experts[econ_expert.id] = econ_expert
        
        # Ethik-Experte
        ethics_expert = ExpertProfile(
            id="ethics-expert",
            name="EthicsGuardian",
            expertise_area="Ethik",
            description="Ethik-Spezialist mit Fokus auf ethische Implikationen von Technologie, "
                        "soziale Gerechtigkeit und moralische Aspekte von Geschäftsentscheidungen.",
            bias_profile={
                "social_justice": 0.9,
                "precautionary_principle": 0.8,
                "tech_skepticism": 0.6,
                "equality_focus": 0.85
            },
            confidence_level=0.78,
            avatar_url="https://example.com/avatars/ethics_expert.png"
        )
        experts[ethics_expert.id] = ethics_expert
        
        # Soziologie-Experte
        socio_expert = ExpertProfile(
            id="socio-expert",
            name="SocietyLens",
            expertise_area="Soziologie",
            description="Soziologe mit Schwerpunkt auf gesellschaftlichen Veränderungen, "
                        "kulturellen Trends und sozialen Auswirkungen technologischer Innovationen.",
            bias_profile={
                "community_focus": 0.8,
                "cultural_relativism": 0.7,
                "tech_impact_awareness": 0.9,
                "historical_perspective": 0.75
            },
            confidence_level=0.80,
            avatar_url="https://example.com/avatars/socio_expert.png"
        )
        experts[socio_expert.id] = socio_expert
        
        # Umwelt-Experte
        env_expert = ExpertProfile(
            id="env-expert",
            name="EcoGuardian",
            expertise_area="Umwelt",
            description="Umweltexperte mit Fokus auf Nachhaltigkeit, Klimawandel und "
                        "ökologische Auswirkungen von Technologie und Wirtschaft.",
            bias_profile={
                "environmental_priority": 0.9,
                "long_term_thinking": 0.85,
                "precautionary_principle": 0.8,
                "tech_skepticism": 0.7
            },
            confidence_level=0.83,
            avatar_url="https://example.com/avatars/env_expert.png"
        )
        experts[env_expert.id] = env_expert
        
        return experts
    
    async def get_expert_profile(self, expert_id: str) -> Optional[ExpertProfile]:
        """
        Ruft das Profil eines Experten anhand seiner ID ab.
        
        Args:
            expert_id: ID des Experten
            
        Returns:
            ExpertProfile des Experten oder None, wenn nicht gefunden
        """
        return self.default_experts.get(expert_id)
    
    async def list_available_experts(self) -> List[ExpertProfile]:
        """
        Listet alle verfügbaren Experten auf.
        
        Returns:
            Liste aller ExpertProfile-Objekte
        """
        return list(self.default_experts.values())
    
    async def generate_expert_response(
        self,
        discussion_id: str,
        message_id: str,
        expert_id: str,
        previous_messages: List[DiscussionMessage],
        focus_points: Optional[List[str]] = None
    ) -> DiscussionMessage:
        """
        Generiert eine Antwort eines Experten auf eine Nachricht in einer Diskussion.
        
        Args:
            discussion_id: ID der Diskussion
            message_id: ID der Nachricht, auf die geantwortet wird
            expert_id: ID des Experten, der antworten soll
            previous_messages: Liste der vorherigen Nachrichten in der Diskussion
            focus_points: Optionale Liste von Punkten, auf die der Experte eingehen soll
            
        Returns:
            DiscussionMessage mit der Antwort des Experten
        """
        # Experten-Profil abrufen
        expert = await self.get_expert_profile(expert_id)
        if not expert:
            raise ValueError(f"Experte mit ID {expert_id} wurde nicht gefunden")
        
        # Kontext für den Experten aufbauen
        expert_context = {
            "expert_profile": expert.dict(),
            "discussion_id": discussion_id,
            "message_id": message_id,
            "previous_messages": [msg.dict() for msg in previous_messages],
            "focus_points": focus_points or []
        }
        
        # Relevante Dokumente finden, die für die Antwort hilfreich sein könnten
        last_message = previous_messages[-1] if previous_messages else None
        references = []
        
        if last_message:
            search_results = await self.vector_db.search_documents(
                query=last_message.content,
                limit=5,
                filters={"relevance_to": expert.expertise_area}
            )
            references = [result.document.id for result in search_results.results]
        
        # Experten-Antwort mit dem LLM generieren
        response_content = await self.llm_service.generate_expert_response(
            expert_profile=expert,
            discussion_context=expert_context,
            document_references=references
        )
        
        # Bias-Analyse der generierten Antwort durchführen
        bias_analysis = await self.detect_bias_in_text(
            text=response_content, 
            expert_profile=expert
        )
        
        # Neue Nachricht erstellen
        expert_message = DiscussionMessage(
            id=f"msg-{uuid.uuid4()}",
            discussion_id=discussion_id,
            sender_id=expert_id,
            sender_type="expert",
            content=response_content,
            timestamp=datetime.now(),
            references=references,
            bias_analysis=bias_analysis.detected_biases if bias_analysis else None,
            confidence_score=expert.confidence_level
        )
        
        # Aktualisieren Sie die Aktivität des Experten
        if discussion_id not in self.active_experts:
            self.active_experts[discussion_id] = {}
        
        self.active_experts[discussion_id][expert_id] = {
            "last_activity": datetime.now(),
            "contribution_count": self.active_experts.get(discussion_id, {}).get(expert_id, {}).get("contribution_count", 0) + 1
        }
        
        return expert_message
    
    async def detect_bias_in_text(
        self,
        text: str,
        expert_profile: Optional[ExpertProfile] = None
    ) -> BiasDetectionResult:
        """
        Erkennt Voreingenommenheit (Bias) in einem Textabschnitt.
        
        Args:
            text: Der zu analysierende Text
            expert_profile: Optionales Expertenprofil für kontextbezogene Bias-Erkennung
            
        Returns:
            BiasDetectionResult mit erkannten Voreingenommenheiten
        """
        # Bias-Kategorien definieren
        bias_categories = {
            "confirmation_bias": "Tendenz, Informationen zu suchen, die bestehende Überzeugungen bestätigen",
            "status_quo_bias": "Präferenz für den aktuellen Zustand",
            "tech_optimism": "Übermäßig positive Einstellung zu technologischen Lösungen",
            "tech_skepticism": "Übermäßig negative Einstellung zu technologischen Lösungen",
            "risk_aversion": "Übermäßige Vorsicht bei Risiken",
            "profit_orientation": "Starker Fokus auf finanzielle Gesichtspunkte",
            "environmental_priority": "Überbewertung von Umweltaspekten",
            "social_justice": "Starker Fokus auf soziale Gerechtigkeit",
            "market_focus": "Überbetonung von Marktmechanismen",
            "authority_bias": "Übermäßiges Vertrauen in Autoritäten"
        }
        
        # Hier würde in einer realen Implementierung ein ML-Modell verwendet werden
        # Für dieses Beispiel simulieren wir eine einfache Analyse
        detected_biases = {}
        
        # Simulierte Bias-Erkennung basierend auf Schlüsselwörtern
        if "definitiv" in text.lower() or "zweifellos" in text.lower() or "sicherlich" in text.lower():
            detected_biases["confirmation_bias"] = 0.7
        
        if "hat sich bewährt" in text.lower() or "traditionell" in text.lower():
            detected_biases["status_quo_bias"] = 0.6
        
        if "revolutionär" in text.lower() or "bahnbrechend" in text.lower() or "innovativ" in text.lower():
            detected_biases["tech_optimism"] = 0.8
        
        if "gefährlich" in text.lower() or "riskant" in text.lower():
            detected_biases["risk_aversion"] = 0.7
        
        if "profit" in text.lower() or "rendite" in text.lower() or "gewinn" in text.lower():
            detected_biases["profit_orientation"] = 0.7
        
        # Bei einem Experten dessen bekannte Biases berücksichtigen
        if expert_profile and expert_profile.bias_profile:
            for bias_type, bias_value in expert_profile.bias_profile.items():
                if bias_type in detected_biases:
                    # Verstärken der Erkennung von bekannten Expertenbias
                    detected_biases[bias_type] = (detected_biases[bias_type] + bias_value) / 2
                elif bias_value > 0.7:  # Nur starke Biases übernehmen, wenn nicht bereits erkannt
                    detected_biases[bias_type] = bias_value * 0.5  # Abgeschwächt übernehmen
        
        # Gesamtbewertung berechnen
        overall_bias_score = sum(detected_biases.values()) / len(detected_biases) if detected_biases else 0.0
        
        # Vorschläge zur Bias-Reduzierung erstellen
        suggestions = []
        for bias_type, bias_value in detected_biases.items():
            if bias_value > 0.6:  # Nur Vorschläge für stärkere Biases
                if bias_type == "confirmation_bias":
                    suggestions.append("Berücksichtigen Sie alternative Perspektiven und Gegenargumente.")
                elif bias_type == "status_quo_bias":
                    suggestions.append("Erwägen Sie innovative Alternativen zum Status quo.")
                elif bias_type == "tech_optimism":
                    suggestions.append("Berücksichtigen Sie auch mögliche Nachteile und Grenzen der Technologie.")
                elif bias_type == "risk_aversion":
                    suggestions.append("Wägen Sie Risiken gegen potenzielle Vorteile ab.")
                elif bias_type == "profit_orientation":
                    suggestions.append("Berücksichtigen Sie auch nicht-finanzielle Aspekte wie soziale und ökologische Auswirkungen.")
        
        # BiasDetectionResult erstellen
        result = BiasDetectionResult(
            text_id=f"text-{uuid.uuid4()}",
            detected_biases=detected_biases,
            overall_bias_score=overall_bias_score,
            suggestions=suggestions
        )
        
        return result
    
    async def adjust_expert_bias(
        self,
        expert_id: str,
        bias_adjustments: Dict[str, float]
    ) -> ExpertProfile:
        """
        Passt die Bias-Profile eines Experten an, um seine Perspektive zu modifizieren.
        
        Args:
            expert_id: ID des Experten
            bias_adjustments: Dict von Bias-Typ zu Änderungswert (-1 bis 1)
            
        Returns:
            Aktualisiertes ExpertProfile
        """
        expert = await self.get_expert_profile(expert_id)
        if not expert:
            raise ValueError(f"Experte mit ID {expert_id} wurde nicht gefunden")
        
        # Tiefe Kopie des Bias-Profils erstellen
        updated_bias_profile = dict(expert.bias_profile) if expert.bias_profile else {}
        
        # Anpassungen anwenden
        for bias_type, adjustment in bias_adjustments.items():
            current_value = updated_bias_profile.get(bias_type, 0.5)
            # Werte zwischen 0 und 1 halten
            updated_bias_profile[bias_type] = max(0.0, min(1.0, current_value + adjustment))
        
        # Experten-Profil aktualisieren
        updated_expert = ExpertProfile(
            id=expert.id,
            name=expert.name,
            expertise_area=expert.expertise_area,
            description=expert.description,
            bias_profile=updated_bias_profile,
            confidence_level=expert.confidence_level,
            avatar_url=expert.avatar_url
        )
        
        # In der Liste der Standardexperten aktualisieren
        self.default_experts[expert_id] = updated_expert
        
        return updated_expert
    
    async def create_custom_expert(
        self,
        name: str,
        expertise_area: str,
        description: str,
        bias_profile: Optional[Dict[str, float]] = None,
        confidence_level: Optional[float] = None,
        avatar_url: Optional[str] = None
    ) -> ExpertProfile:
        """
        Erstellt einen benutzerdefinierten Experten mit spezifischen Eigenschaften.
        
        Args:
            name: Name des Experten
            expertise_area: Fachgebiet des Experten
            description: Beschreibung des Experten
            bias_profile: Optionales Bias-Profil
            confidence_level: Optionales Konfidenzlevel
            avatar_url: Optionale URL für das Avatar-Bild
            
        Returns:
            Neu erstelltes ExpertProfile
        """
        # Neue Experten-ID generieren
        expert_id = f"custom-expert-{uuid.uuid4()}"
        
        # Neues ExpertProfile erstellen
        new_expert = ExpertProfile(
            id=expert_id,
            name=name,
            expertise_area=expertise_area,
            description=description,
            bias_profile=bias_profile or {},
            confidence_level=confidence_level or 0.7,
            avatar_url=avatar_url
        )
        
        # Zu den verfügbaren Experten hinzufügen
        self.default_experts[expert_id] = new_expert
        
        logger.info(f"Benutzerdefinierter Experte erstellt: {expert_id} - {name}")
        
        return new_expert
    
    async def analyze_expert_contributions(
        self,
        discussion_id: str,
        messages: List[DiscussionMessage]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Analysiert die Beiträge aller Experten in einer Diskussion.
        
        Args:
            discussion_id: ID der Diskussion
            messages: Liste aller Nachrichten in der Diskussion
            
        Returns:
            Dict von Experten-IDs zu Analyseergebnissen
        """
        # Experten-Nachrichten filtern
        expert_messages = [msg for msg in messages if msg.sender_type == "expert"]
        
        # Gruppieren nach Experten
        experts_data = {}
        for msg in expert_messages:
            expert_id = msg.sender_id
            if expert_id not in experts_data:
                expert = await self.get_expert_profile(expert_id)
                experts_data[expert_id] = {
                    "expert": expert.dict() if expert else None,
                    "messages": [],
                    "contribution_count": 0,
                    "biases": {},
                    "keywords": {}
                }
            
            experts_data[expert_id]["messages"].append(msg)
            experts_data[expert_id]["contribution_count"] += 1
            
            # Bias-Analyse aggregieren
            if msg.bias_analysis:
                for bias_type, bias_value in msg.bias_analysis.items():
                    if bias_type not in experts_data[expert_id]["biases"]:
                        experts_data[expert_id]["biases"][bias_type] = []
                    experts_data[expert_id]["biases"][bias_type].append(bias_value)
        
        # Analyseergebnisse berechnen
        results = {}
        for expert_id, data in experts_data.items():
            # Durchschnittliche Bias-Werte berechnen
            avg_biases = {}
            for bias_type, values in data["biases"].items():
                avg_biases[bias_type] = sum(values) / len(values)
            
            # Informationen über einzigartige Perspektiven bestimmen
            # In einer realen Implementierung würde hier eine komplexere Analyse stattfinden
            unique_perspectives = min(5, data["contribution_count"])
            
            # Konsistenz der Biases berechnen
            bias_consistency = 0.0
            if data["biases"]:
                consistency_values = []
                for values in data["biases"].values():
                    if len(values) > 1:
                        # Standardabweichung berechnen würde hier mehr Sinn machen
                        max_diff = max(values) - min(values)
                        consistency_values.append(1.0 - max_diff)
                
                if consistency_values:
                    bias_consistency = sum(consistency_values) / len(consistency_values)
            
            # Ergebnisse zusammenstellen
            results[expert_id] = {
                "contribution_count": data["contribution_count"],
                "unique_perspectives": unique_perspectives,
                "bias_profile": avg_biases,
                "bias_consistency": bias_consistency
            }
        
        return results 