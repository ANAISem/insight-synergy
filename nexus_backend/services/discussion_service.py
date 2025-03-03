"""
Diskussions-Service für die Cognitive Loop AI.

Dieser Service verwaltet komplexe Diskussionen, einschließlich der 
Nachrichtenverfolgung, Fortschrittsüberwachung und Generierung adaptiver Antworten.
"""

import uuid
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from ..db.vector_db import VectorDB
from ..services.llm_service import LLMService
from ..services.experts_service import ExpertsService
from ..models.schemas import (
    Discussion,
    DiscussionMessage,
    DiscussionTopic,
    DiscussionAnalysis,
    ExpertProfile,
    MessageCreateRequest,
    ExpertResponseRequest,
    BiasDetectionResult
)

logger = logging.getLogger(__name__)


class DiscussionService:
    """
    Service zur Verwaltung komplexer Diskussionen in der Cognitive Loop AI.
    
    Diese Klasse enthält Funktionen für die Initialisierung, Verfolgung und 
    Analyse von Diskussionen, sowie für die Generierung adaptiver Antworten.
    """
    
    def __init__(
        self, 
        llm_service: LLMService, 
        vector_db: VectorDB,
        experts_service: ExpertsService
    ):
        """
        Initialisiert den DiscussionService mit den erforderlichen Abhängigkeiten.
        
        Args:
            llm_service: LLM-Service für die Generierung von Antworten
            vector_db: Vector-DB für den Zugriff auf das Wissen
            experts_service: Service für die Verwaltung von Experten
        """
        self.llm_service = llm_service
        self.vector_db = vector_db
        self.experts_service = experts_service
        
        # Aktive Diskussionen verwalten
        self.active_discussions: Dict[str, Discussion] = {}
        
        # Nachrichten-Verlauf für alle Diskussionen
        self.messages: Dict[str, List[DiscussionMessage]] = {}
        
        # Diskussionsanalysen
        self.discussion_analyses: Dict[str, DiscussionAnalysis] = {}
        
        logger.info("DiscussionService wurde initialisiert")
    
    async def create_discussion(
        self,
        title: str,
        description: str,
        initial_question: str,
        topic_id: Optional[str] = None,
        expert_ids: Optional[List[str]] = None
    ) -> Tuple[Discussion, DiscussionMessage]:
        """
        Erstellt eine neue Diskussion mit einer initialen Frage.
        
        Args:
            title: Titel der Diskussion
            description: Beschreibung der Diskussion
            initial_question: Initiale Frage, die die Diskussion startet
            topic_id: Optionale ID eines vorhandenen Diskussionsthemas
            expert_ids: Optionale Liste von Experten, die an der Diskussion teilnehmen sollen
            
        Returns:
            Tuple mit der erstellten Diskussion und der initialen Nachricht
        """
        # Diskussions-ID generieren
        discussion_id = f"discussion-{uuid.uuid4()}"
        
        # Teilnehmer vorbereiten
        participants = []
        if expert_ids:
            for expert_id in expert_ids:
                expert = await self.experts_service.get_expert_profile(expert_id)
                if expert:
                    participants.append({
                        "id": expert_id,
                        "type": "expert",
                        "name": expert.name
                    })
        
        # Diskussion erstellen
        discussion = Discussion(
            id=discussion_id,
            topic_id=topic_id,
            title=title,
            description=description,
            status="active",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            participants=participants,
            message_count=1
        )
        
        # Initiale Nachricht erstellen
        initial_message = DiscussionMessage(
            id=f"msg-{uuid.uuid4()}",
            discussion_id=discussion_id,
            sender_id="user",
            sender_type="user",
            content=initial_question,
            timestamp=datetime.now(),
            references=[],
            confidence_score=1.0
        )
        
        # Diskussion und Nachricht speichern
        self.active_discussions[discussion_id] = discussion
        self.messages[discussion_id] = [initial_message]
        
        # Initiale Diskussionsanalyse erstellen
        await self.create_discussion_analysis(discussion_id)
        
        logger.info(f"Neue Diskussion erstellt: {discussion_id} - {title}")
        
        return discussion, initial_message
    
    async def get_discussion(self, discussion_id: str) -> Optional[Discussion]:
        """
        Ruft eine Diskussion anhand ihrer ID ab.
        
        Args:
            discussion_id: ID der Diskussion
            
        Returns:
            Discussion oder None, wenn nicht gefunden
        """
        return self.active_discussions.get(discussion_id)
    
    async def list_discussions(
        self,
        limit: int = 10,
        offset: int = 0,
        status: Optional[str] = None
    ) -> List[Discussion]:
        """
        Listet alle Diskussionen mit optionaler Filterung auf.
        
        Args:
            limit: Maximale Anzahl der zurückzugebenden Diskussionen
            offset: Anzahl der zu überspringenden Diskussionen (für Paginierung)
            status: Optionaler Filter für den Diskussionsstatus
            
        Returns:
            Liste von Diskussions-Objekten
        """
        discussions = list(self.active_discussions.values())
        
        # Nach Status filtern
        if status:
            discussions = [d for d in discussions if d.status == status]
        
        # Nach Aktualisierungsdatum sortieren (neueste zuerst)
        discussions.sort(key=lambda d: d.updated_at, reverse=True)
        
        # Paginierung anwenden
        return discussions[offset:offset + limit]
    
    async def add_message(
        self,
        discussion_id: str,
        content: str,
        sender_id: str,
        sender_type: str,
        references: Optional[List[str]] = None
    ) -> DiscussionMessage:
        """
        Fügt eine neue Nachricht zu einer Diskussion hinzu.
        
        Args:
            discussion_id: ID der Diskussion
            content: Inhalt der Nachricht
            sender_id: ID des Absenders
            sender_type: Typ des Absenders ('user' oder 'expert')
            references: Optionale Liste von Dokumentreferenzen
            
        Returns:
            Erstellte DiscussionMessage
        """
        discussion = await self.get_discussion(discussion_id)
        if not discussion:
            raise ValueError(f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Neue Nachricht erstellen
        message = DiscussionMessage(
            id=f"msg-{uuid.uuid4()}",
            discussion_id=discussion_id,
            sender_id=sender_id,
            sender_type=sender_type,
            content=content,
            timestamp=datetime.now(),
            references=references or [],
            confidence_score=1.0 if sender_type == "user" else 0.8
        )
        
        # Wenn es eine Expertenantwort ist, Bias-Analyse durchführen
        if sender_type == "expert":
            expert = await self.experts_service.get_expert_profile(sender_id)
            if expert:
                bias_result = await self.experts_service.detect_bias_in_text(
                    text=content,
                    expert_profile=expert
                )
                if bias_result:
                    message.bias_analysis = bias_result.detected_biases
        
        # Nachricht zur Diskussion hinzufügen
        if discussion_id not in self.messages:
            self.messages[discussion_id] = []
        self.messages[discussion_id].append(message)
        
        # Diskussionsinformationen aktualisieren
        discussion.message_count = len(self.messages[discussion_id])
        discussion.updated_at = datetime.now()
        
        # Diskussionsanalyse aktualisieren
        await self.update_discussion_analysis(discussion_id)
        
        logger.info(f"Nachricht hinzugefügt: {message.id} zu Diskussion {discussion_id}")
        
        return message
    
    async def get_messages(
        self,
        discussion_id: str,
        limit: int = 50,
        before_timestamp: Optional[datetime] = None
    ) -> List[DiscussionMessage]:
        """
        Ruft Nachrichten für eine Diskussion ab.
        
        Args:
            discussion_id: ID der Diskussion
            limit: Maximale Anzahl der zurückzugebenden Nachrichten
            before_timestamp: Optionaler Zeitstempel für Nachrichten vor einem bestimmten Datum
            
        Returns:
            Liste von DiscussionMessage-Objekten
        """
        if discussion_id not in self.messages:
            return []
        
        messages = self.messages[discussion_id]
        
        # Nach Zeitstempel filtern
        if before_timestamp:
            messages = [msg for msg in messages if msg.timestamp < before_timestamp]
        
        # Nach Zeitstempel sortieren (neueste zuerst)
        messages.sort(key=lambda msg: msg.timestamp, reverse=True)
        
        # Limit anwenden
        return messages[:limit]
    
    async def generate_adaptive_response(
        self,
        discussion_id: str,
        message_id: str,
        expertise_areas: Optional[List[str]] = None,
        focus_points: Optional[List[str]] = None,
        max_experts: int = 3
    ) -> List[DiscussionMessage]:
        """
        Generiert adaptive Antworten von Experten auf eine Nachricht.
        
        Args:
            discussion_id: ID der Diskussion
            message_id: ID der Nachricht, auf die geantwortet werden soll
            expertise_areas: Optionale Liste von Fachgebieten für die Antwort
            focus_points: Optionale Liste von Schwerpunkten für die Antwort
            max_experts: Maximale Anzahl von Experten, die antworten sollen
            
        Returns:
            Liste von generierten Experten-Antworten
        """
        discussion = await self.get_discussion(discussion_id)
        if not discussion:
            raise ValueError(f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Alle Nachrichten in der Diskussion abrufen
        all_messages = self.messages.get(discussion_id, [])
        if not all_messages:
            raise ValueError(f"Keine Nachrichten in Diskussion {discussion_id} gefunden")
        
        # Finde die Nachricht, auf die geantwortet werden soll
        target_message = None
        for msg in all_messages:
            if msg.id == message_id:
                target_message = msg
                break
        
        if not target_message:
            raise ValueError(f"Nachricht mit ID {message_id} wurde nicht gefunden")
        
        # Bestimme, welche Experten antworten sollen
        if expertise_areas:
            # Experten nach angegebenen Fachgebieten filtern
            experts = await self.experts_service.list_available_experts()
            selected_experts = [
                expert for expert in experts 
                if expert.expertise_area in expertise_areas
            ]
        else:
            # Analyse der Nachricht, um relevante Experten zu bestimmen
            context_analysis = await self.llm_service.analyze_message_context(target_message.content)
            
            # Alle Experten abrufen
            all_experts = await self.experts_service.list_available_experts()
            
            # Relevanz-Score für jeden Experten berechnen
            expert_scores = []
            for expert in all_experts:
                # Hier würde eine komplexere Relevanzanalyse durchgeführt werden
                # Für dieses Beispiel verwenden wir einen einfachen Ansatz
                relevance = 0.5  # Standardrelevanz
                
                # Erhöhe die Relevanz, wenn das Fachgebiet des Experten in den Schlüsselwörtern vorkommt
                if expert.expertise_area.lower() in target_message.content.lower():
                    relevance += 0.3
                
                # Erhöhe die Relevanz, wenn der Experte bereits an dieser Diskussion teilgenommen hat
                active_experts = self.experts_service.active_experts.get(discussion_id, {})
                if expert.id in active_experts:
                    relevance += 0.2
                    
                expert_scores.append((expert, relevance))
            
            # Experten nach Relevanz sortieren und die relevantesten auswählen
            expert_scores.sort(key=lambda x: x[1], reverse=True)
            selected_experts = [expert for expert, _ in expert_scores[:max_experts]]
        
        # Stelle sicher, dass wir nicht mehr als max_experts Experten haben
        if len(selected_experts) > max_experts:
            selected_experts = selected_experts[:max_experts]
        
        # Generiere Antworten von allen ausgewählten Experten
        generated_messages = []
        for expert in selected_experts:
            try:
                # Vorherige Nachrichten als Kontext verwenden
                response = await self.experts_service.generate_expert_response(
                    discussion_id=discussion_id,
                    message_id=message_id,
                    expert_id=expert.id,
                    previous_messages=all_messages,
                    focus_points=focus_points
                )
                
                # Nachricht zur Diskussion hinzufügen
                self.messages[discussion_id].append(response)
                
                # Diskussionsinformationen aktualisieren
                discussion.message_count = len(self.messages[discussion_id])
                discussion.updated_at = datetime.now()
                
                generated_messages.append(response)
                
                logger.info(f"Adaptive Antwort generiert von Experte {expert.id} in Diskussion {discussion_id}")
            except Exception as e:
                logger.error(f"Fehler bei der Generierung einer Antwort von Experte {expert.id}: {str(e)}")
        
        # Diskussionsanalyse aktualisieren
        await self.update_discussion_analysis(discussion_id)
        
        return generated_messages
    
    async def create_discussion_analysis(self, discussion_id: str) -> DiscussionAnalysis:
        """
        Erstellt eine neue Diskussionsanalyse für eine Diskussion.
        
        Args:
            discussion_id: ID der Diskussion
            
        Returns:
            Erstellte DiscussionAnalysis
        """
        discussion = await self.get_discussion(discussion_id)
        if not discussion:
            raise ValueError(f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Initiale Analyse erstellen
        analysis = DiscussionAnalysis(
            id=f"analysis-{uuid.uuid4()}",
            discussion_id=discussion_id,
            key_insights=[],
            progression_score=0.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            bias_assessment={},
            expert_contribution_analysis={}
        )
        
        # Analyse speichern
        self.discussion_analyses[discussion_id] = analysis
        
        return analysis
    
    async def update_discussion_analysis(self, discussion_id: str) -> DiscussionAnalysis:
        """
        Aktualisiert die Analyse einer Diskussion basierend auf neuen Nachrichten.
        
        Args:
            discussion_id: ID der Diskussion
            
        Returns:
            Aktualisierte DiscussionAnalysis
        """
        discussion = await self.get_discussion(discussion_id)
        if not discussion:
            raise ValueError(f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Aktuelle Analyse abrufen oder eine neue erstellen, wenn keine vorhanden ist
        analysis = self.discussion_analyses.get(discussion_id)
        if not analysis:
            analysis = await self.create_discussion_analysis(discussion_id)
        
        # Alle Nachrichten in der Diskussion abrufen
        messages = self.messages.get(discussion_id, [])
        if not messages:
            return analysis
        
        # Nur Nachrichten berücksichtigen, die seit der letzten Analyse hinzugefügt wurden
        new_messages = [msg for msg in messages if msg.timestamp > analysis.updated_at]
        if not new_messages:
            return analysis
        
        # Schlüsselerkenntnisse extrahieren (würde in einer realen Implementierung ein LLM verwenden)
        if len(messages) >= 3:  # Mindestens 3 Nachrichten, um sinnvolle Erkenntnisse zu extrahieren
            # Hier würde in einer realen Implementierung ein LLM verwendet werden, um Erkenntnisse zu extrahieren
            # Für dieses Beispiel simulieren wir einige Erkenntnisse
            extracted_insights = await self.llm_service.extract_key_insights(messages)
            
            # Bestehende Erkenntnisse aktualisieren, ohne Duplikate hinzuzufügen
            existing_insights = set(analysis.key_insights)
            for insight in extracted_insights:
                if insight not in existing_insights:
                    analysis.key_insights.append(insight)
                    existing_insights.add(insight)
        
        # Fortschrittsbewertung aktualisieren
        if len(messages) > 1:
            # In einer realen Implementierung würde hier eine komplexere Analyse durchgeführt werden
            # Für dieses Beispiel verwenden wir eine einfache Formel
            progress_increment = min(0.1, 1.0 / (len(messages) + 10))  # Nimmt mit mehr Nachrichten ab
            analysis.progression_score = min(1.0, analysis.progression_score + progress_increment)
        
        # Experten-Beitragsanalyse durchführen, wenn Experten in der Diskussion sind
        expert_messages = [msg for msg in messages if msg.sender_type == "expert"]
        if expert_messages:
            contribution_analysis = await self.experts_service.analyze_expert_contributions(
                discussion_id, messages
            )
            analysis.expert_contribution_analysis = contribution_analysis
        
        # Bias-Bewertung aktualisieren
        # Agregiere alle Bias-Analysen aus den Nachrichten
        all_biases = {}
        bias_count = 0
        
        for msg in messages:
            if msg.bias_analysis:
                bias_count += 1
                for bias_type, bias_value in msg.bias_analysis.items():
                    if bias_type not in all_biases:
                        all_biases[bias_type] = []
                    all_biases[bias_type].append(bias_value)
        
        # Durchschnittliche Bias-Werte berechnen
        avg_biases = {}
        for bias_type, values in all_biases.items():
            avg_biases[bias_type] = sum(values) / len(values)
        
        analysis.bias_assessment = {
            "average_biases": avg_biases,
            "bias_diversity": len(all_biases),
            "bias_count": bias_count
        }
        
        # Analyse aktualisieren
        analysis.updated_at = datetime.now()
        self.discussion_analyses[discussion_id] = analysis
        
        logger.info(f"Diskussionsanalyse aktualisiert für Diskussion {discussion_id}")
        
        return analysis
    
    async def get_discussion_analysis(self, discussion_id: str) -> Optional[DiscussionAnalysis]:
        """
        Ruft die Analyse einer Diskussion ab.
        
        Args:
            discussion_id: ID der Diskussion
            
        Returns:
            DiscussionAnalysis oder None, wenn nicht gefunden
        """
        return self.discussion_analyses.get(discussion_id)
    
    async def close_discussion(self, discussion_id: str, summary: Optional[str] = None) -> Discussion:
        """
        Schließt eine Diskussion.
        
        Args:
            discussion_id: ID der Diskussion
            summary: Optionale Zusammenfassung der Diskussion
            
        Returns:
            Aktualisierte Discussion
        """
        discussion = await self.get_discussion(discussion_id)
        if not discussion:
            raise ValueError(f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Diskussion schließen
        discussion.status = "closed"
        discussion.updated_at = datetime.now()
        
        # Wenn keine Zusammenfassung angegeben wurde, eine generieren
        if not summary and discussion_id in self.messages:
            messages = self.messages[discussion_id]
            if messages:
                # Hier würde in einer realen Implementierung ein LLM verwendet werden
                summary = await self.llm_service.generate_discussion_summary(messages)
                discussion.summary = summary
        else:
            discussion.summary = summary
        
        logger.info(f"Diskussion {discussion_id} wurde geschlossen")
        
        return discussion
    
    async def search_discussions(self, query: str, limit: int = 10) -> List[Discussion]:
        """
        Sucht nach Diskussionen basierend auf einem Suchbegriff.
        
        Args:
            query: Suchbegriff
            limit: Maximale Anzahl der Ergebnisse
            
        Returns:
            Liste von gefundenen Diskussionen
        """
        results = []
        
        for discussion in self.active_discussions.values():
            # Titel und Beschreibung durchsuchen
            if (query.lower() in discussion.title.lower() or 
                query.lower() in discussion.description.lower()):
                results.append(discussion)
                continue
            
            # Nachrichten durchsuchen
            if discussion.id in self.messages:
                for msg in self.messages[discussion.id]:
                    if query.lower() in msg.content.lower():
                        results.append(discussion)
                        break
        
        # Nach Relevanz sortieren (hier vereinfacht nach Aktualisierungsdatum)
        results.sort(key=lambda d: d.updated_at, reverse=True)
        
        return results[:limit] 