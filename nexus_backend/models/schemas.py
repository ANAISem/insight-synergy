"""
Pydantic-Modelle für API-Anfragen und -Antworten im Nexus-Backend.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, HttpUrl, constr
from datetime import datetime
from enum import Enum


class SourceType(str, Enum):
    """Enum für Quellentypen von Wissen."""
    DOCUMENT = "document"
    WEBSITE = "website"
    DATABASE = "database"
    API = "api"
    USER_INPUT = "user_input"
    GENERATED = "generated"


class MetadataBase(BaseModel):
    """Basismodell für Metadaten von Wissensquellen."""
    source_type: SourceType = Field(default=SourceType.DOCUMENT, description="Typ der Wissensquelle")
    source_name: Optional[str] = Field(default=None, description="Name der Quelle")
    source_url: Optional[HttpUrl] = Field(default=None, description="URL der Quelle, falls verfügbar")
    created_at: datetime = Field(default_factory=datetime.now, description="Erstellungszeitpunkt")
    updated_at: Optional[datetime] = Field(default=None, description="Letzter Aktualisierungszeitpunkt")
    tags: List[str] = Field(default_factory=list, description="Tags für die Kategorisierung")
    confidence: Optional[float] = Field(default=None, description="Vertrauenswürdigkeit (0-1)")
    language: str = Field(default="de", description="Sprache des Inhalts (ISO 639-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_type": "document",
                "source_name": "Wissensbasis 2023",
                "tags": ["wissen", "dokument"],
                "language": "de"
            }
        }


class DocumentBase(BaseModel):
    """Basismodell für Dokumente in der Wissensdatenbank."""
    content: str = Field(..., description="Inhalt des Dokuments/Textstücks")
    metadata: MetadataBase = Field(default_factory=MetadataBase, description="Metadaten")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "Berlin ist die Hauptstadt von Deutschland.",
                "metadata": {
                    "source_type": "document",
                    "source_name": "Geographie-Lexikon",
                    "tags": ["geographie", "deutschland"]
                }
            }
        }


class DocumentCreate(DocumentBase):
    """Modell für das Erstellen eines neuen Dokuments."""
    id: Optional[str] = Field(default=None, description="Optionale benutzerdefinierte ID")


class DocumentResponse(DocumentBase):
    """Modell für die Antwort nach dem Erstellen/Abrufen eines Dokuments."""
    id: str = Field(..., description="Dokument-ID")
    embedding_model: Optional[str] = Field(default=None, description="Verwendetes Embedding-Modell")
    vector_id: Optional[str] = Field(default=None, description="ID in der Vektordatenbank")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "doc123",
                "content": "Berlin ist die Hauptstadt von Deutschland.",
                "metadata": {
                    "source_type": "document",
                    "source_name": "Geographie-Lexikon",
                    "tags": ["geographie", "deutschland"]
                },
                "embedding_model": "paraphrase-multilingual-MiniLM-L12-v2",
                "vector_id": "vec_123456"
            }
        }


class SearchQuery(BaseModel):
    """Modell für eine Suchanfrage an die Wissensdatenbank."""
    query: str = Field(..., description="Suchanfrage")
    max_results: int = Field(default=5, description="Maximale Anzahl von Ergebnissen")
    filter_criteria: Optional[Dict[str, Any]] = Field(default=None, description="Filterkriterien für die Suche")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "Was ist die Hauptstadt von Deutschland?",
                "max_results": 3,
                "filter_criteria": {"metadata.tags": "geographie"}
            }
        }


class SearchResult(BaseModel):
    """Modell für ein einzelnes Suchergebnis."""
    document: DocumentResponse
    score: float = Field(..., description="Relevanz-Score (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "document": {
                    "id": "doc123",
                    "content": "Berlin ist die Hauptstadt von Deutschland.",
                    "metadata": {
                        "source_type": "document",
                        "source_name": "Geographie-Lexikon",
                        "tags": ["geographie", "deutschland"]
                    }
                },
                "score": 0.92
            }
        }


class SearchResponse(BaseModel):
    """Modell für die Antwort auf eine Suchanfrage."""
    results: List[SearchResult]
    query: str = Field(..., description="Ursprüngliche Suchanfrage")
    total_results: int = Field(..., description="Gesamtanzahl der gefundenen Ergebnisse")
    processing_time_ms: float = Field(..., description="Verarbeitungszeit in Millisekunden")
    
    class Config:
        json_schema_extra = {
            "example": {
                "results": [
                    {
                        "document": {
                            "id": "doc123",
                            "content": "Berlin ist die Hauptstadt von Deutschland.",
                            "metadata": {
                                "source_type": "document",
                                "source_name": "Geographie-Lexikon"
                            }
                        },
                        "score": 0.92
                    }
                ],
                "query": "Was ist die Hauptstadt von Deutschland?",
                "total_results": 1,
                "processing_time_ms": 45.3
            }
        }


class KnowledgeQuery(BaseModel):
    """Modell für eine komplexe Wissensabfrage mit RAG-Antwortgenerierung."""
    query: str = Field(..., description="Frage oder Abfrage")
    max_context_docs: int = Field(default=5, description="Maximale Anzahl von Kontextdokumenten")
    filter_criteria: Optional[Dict[str, Any]] = Field(default=None, description="Filterkriterien für die Suche")
    response_format: Optional[str] = Field(default=None, description="Gewünschtes Antwortformat (Text/JSON/etc.)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "Beschreibe die wichtigsten Sehenswürdigkeiten von Berlin",
                "max_context_docs": 3,
                "filter_criteria": {"metadata.tags": "berlin"}
            }
        }


class CitationInfo(BaseModel):
    """Modell für Zitationsinformationen."""
    document_id: str = Field(..., description="ID des zitierten Dokuments")
    content_snippet: str = Field(..., description="Zitierter Textausschnitt")
    source_name: Optional[str] = Field(default=None, description="Name der Quelle")
    source_url: Optional[HttpUrl] = Field(default=None, description="URL der Quelle")
    relevance_score: float = Field(..., description="Relevanz-Score (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "doc123",
                "content_snippet": "Berlin ist die Hauptstadt von Deutschland.",
                "source_name": "Geographie-Lexikon",
                "relevance_score": 0.92
            }
        }


class KnowledgeResponse(BaseModel):
    """Modell für die Antwort auf eine Wissensabfrage."""
    query: str = Field(..., description="Ursprüngliche Abfrage")
    answer: str = Field(..., description="Generierte Antwort")
    citations: List[CitationInfo] = Field(default_factory=list, description="Quellenangaben")
    confidence: float = Field(..., description="Konfidenz der Antwort (0-1)")
    processing_time_ms: float = Field(..., description="Verarbeitungszeit in Millisekunden")
    context_docs_count: int = Field(..., description="Anzahl der verwendeten Kontextdokumente")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "Was ist die Hauptstadt von Deutschland?",
                "answer": "Die Hauptstadt von Deutschland ist Berlin.",
                "citations": [
                    {
                        "document_id": "doc123",
                        "content_snippet": "Berlin ist die Hauptstadt von Deutschland.",
                        "source_name": "Geographie-Lexikon",
                        "relevance_score": 0.92
                    }
                ],
                "confidence": 0.95,
                "processing_time_ms": 230.5,
                "context_docs_count": 1
            }
        }


class DocumentBatchUploadRequest(BaseModel):
    """Modell für das Hochladen mehrerer Dokumente in einem Batch."""
    documents: List[DocumentCreate] = Field(..., description="Liste von Dokumenten")
    
    class Config:
        json_schema_extra = {
            "example": {
                "documents": [
                    {
                        "content": "Berlin ist die Hauptstadt von Deutschland.",
                        "metadata": {
                            "source_type": "document",
                            "source_name": "Geographie-Lexikon",
                            "tags": ["geographie", "deutschland"]
                        }
                    },
                    {
                        "content": "München ist die Hauptstadt von Bayern.",
                        "metadata": {
                            "source_type": "document",
                            "source_name": "Geographie-Lexikon",
                            "tags": ["geographie", "deutschland", "bayern"]
                        }
                    }
                ]
            }
        }


class DocumentBatchUploadResponse(BaseModel):
    """Modell für die Antwort nach dem Batch-Upload von Dokumenten."""
    success_count: int = Field(..., description="Anzahl erfolgreich hochgeladener Dokumente")
    failed_count: int = Field(..., description="Anzahl fehlgeschlagener Uploads")
    document_ids: List[str] = Field(..., description="IDs der hochgeladenen Dokumente")
    processing_time_ms: float = Field(..., description="Verarbeitungszeit in Millisekunden")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success_count": 2,
                "failed_count": 0,
                "document_ids": ["doc123", "doc124"],
                "processing_time_ms": 150.2
            }
        }


class HealthCheckResponse(BaseModel):
    """Modell für die Gesundheitsprüfung des Systems."""
    status: str = Field(..., description="Systemstatus (OK, ERROR, DEGRADED)")
    version: str = Field(..., description="Aktuelle Softwareversion")
    uptime_seconds: float = Field(..., description="Laufzeit in Sekunden")
    database_status: str = Field(..., description="Status der Vektordatenbank")
    document_count: int = Field(..., description="Anzahl der Dokumente in der Datenbank")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "OK",
                "version": "1.0.0",
                "uptime_seconds": 3600.5,
                "database_status": "CONNECTED",
                "document_count": 1000
            }
        }


class ErrorResponse(BaseModel):
    """Modell für Fehlerantworten."""
    error_code: str = Field(..., description="Fehlercode")
    message: str = Field(..., description="Fehlermeldung")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Zusätzliche Fehlerdetails")
    timestamp: datetime = Field(default_factory=datetime.now, description="Zeitpunkt des Fehlers")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "DOCUMENT_NOT_FOUND",
                "message": "Das angeforderte Dokument wurde nicht gefunden",
                "details": {"document_id": "doc123"},
                "timestamp": "2023-07-25T12:34:56.789Z"
            }
        }


# Cognitive Loop AI - Schemas für Diskussionen und Multi-Experten-System

class ExpertProfile(BaseModel):
    """Profil eines Experten im Multi-Experten-System."""
    id: str
    name: str
    expertise_area: str
    description: str
    bias_profile: Optional[Dict[str, float]] = None
    confidence_level: Optional[float] = None
    avatar_url: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "tech-expert-1",
                "name": "TechAnalyst",
                "expertise_area": "Technologie",
                "description": "Spezialist für moderne Technologietrends und -entwicklungen",
                "bias_profile": {
                    "tech_optimism": 0.7,
                    "risk_aversion": 0.3
                },
                "confidence_level": 0.85,
                "avatar_url": "https://example.com/avatars/tech_expert.png"
            }
        }


class DiscussionMessage(BaseModel):
    """Eine Nachricht innerhalb einer Diskussion."""
    id: str
    discussion_id: str
    sender_id: str
    sender_type: str  # "user", "expert", "system"
    content: str
    timestamp: datetime
    references: Optional[List[str]] = None  # Referenzen auf Dokumente oder Wissen
    sentiment_analysis: Optional[Dict[str, float]] = None
    bias_analysis: Optional[Dict[str, float]] = None
    confidence_score: Optional[float] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "msg-123",
                "discussion_id": "disc-456",
                "sender_id": "tech-expert-1",
                "sender_type": "expert",
                "content": "Die Entwicklung von Quantencomputing schreitet schneller voran als erwartet.",
                "timestamp": "2023-09-20T14:23:15Z",
                "references": ["doc-789", "doc-101"],
                "sentiment_analysis": {
                    "positivity": 0.7,
                    "certainty": 0.8
                },
                "bias_analysis": {
                    "tech_optimism": 0.6
                },
                "confidence_score": 0.85
            }
        }


class DiscussionTopic(BaseModel):
    """Ein Diskussionsthema mit zugehörigen Parametern."""
    id: str
    title: str
    description: str
    keywords: List[str]
    relevance_vector: Optional[List[float]] = None  # Semantischer Vektor des Themas
    complexity_level: Optional[float] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "topic-123",
                "title": "Auswirkungen von KI auf den Arbeitsmarkt",
                "description": "Diskussion über die langfristigen Auswirkungen der KI-Automatisierung auf Arbeitsplätze",
                "keywords": ["KI", "Automatisierung", "Arbeitsmarkt", "Zukunft der Arbeit"],
                "relevance_vector": [0.1, 0.2, 0.3, 0.4],  # Vereinfachtes Beispiel
                "complexity_level": 0.75
            }
        }


class Discussion(BaseModel):
    """Eine vollständige Diskussion mit allen Metadaten."""
    id: str
    topic_id: str
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: str  # "active", "paused", "completed", "archived"
    participants: List[str]  # Liste von Experten-IDs
    message_count: int
    progress_summary: Optional[str] = None
    current_focus: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "disc-456",
                "topic_id": "topic-123",
                "title": "KI und die Zukunft der Wissensarbeit",
                "description": "Analyse der Veränderungen in wissensbasierten Berufen durch KI",
                "created_at": "2023-09-20T10:00:00Z",
                "updated_at": "2023-09-20T15:30:00Z",
                "status": "active",
                "participants": ["tech-expert-1", "econ-expert-1", "socio-expert-1"],
                "message_count": 24,
                "progress_summary": "Die Diskussion hat mehrere Perspektiven zur Transformation der Wissensarbeit herausgearbeitet.",
                "current_focus": "Umschulungs- und Anpassungsstrategien"
            }
        }


class DiscussionAnalysis(BaseModel):
    """Analyse einer Diskussion mit Erkenntnissen und Fortschritt."""
    discussion_id: str
    analysis_timestamp: datetime
    key_insights: List[str]
    progression_score: float  # 0-1, wie gut die Diskussion fortschreitet
    bias_assessment: Dict[str, float]
    expert_contribution_analysis: Dict[str, Dict[str, Any]]  # Nach Experten aufgeschlüsselte Beitragsanalyse
    topic_coverage: Dict[str, float]  # Themenabdeckung nach Schlüsselworten
    recommended_focus: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "discussion_id": "disc-456",
                "analysis_timestamp": "2023-09-20T15:35:00Z",
                "key_insights": [
                    "KI wird Routineaufgaben in wissensbasierten Berufen übernehmen",
                    "Neue Rollen werden sich um die Interpretation und Anwendung von KI-generierten Erkenntnissen entwickeln"
                ],
                "progression_score": 0.68,
                "bias_assessment": {
                    "tech_optimism": 0.62,
                    "status_quo_bias": 0.37
                },
                "expert_contribution_analysis": {
                    "tech-expert-1": {
                        "contribution_count": 8,
                        "unique_perspectives": 5,
                        "bias_consistency": 0.85
                    }
                },
                "topic_coverage": {
                    "automation": 0.87,
                    "job_displacement": 0.65,
                    "skill_evolution": 0.42
                },
                "recommended_focus": "Diskussion sollte mehr auf praktische Umschulungsstrategien eingehen"
            }
        }


class BiasDetectionResult(BaseModel):
    """Ergebnis der Bias-Erkennung für einen Text oder eine Diskussion."""
    text_id: str  # Kann eine Nachrichten-ID oder Diskussions-ID sein
    detected_biases: Dict[str, float]  # Bias-Typ und Stärke (0-1)
    overall_bias_score: float  # Gesamtwert der Voreingenommenheit (0-1)
    suggestions: Optional[List[str]] = None  # Vorschläge zur Bias-Reduzierung
    
    class Config:
        schema_extra = {
            "example": {
                "text_id": "msg-123",
                "detected_biases": {
                    "confirmation_bias": 0.75,
                    "tech_optimism": 0.82,
                    "status_quo_bias": 0.31
                },
                "overall_bias_score": 0.63,
                "suggestions": [
                    "Berücksichtigen Sie Gegenargumente zur Technologieadoption",
                    "Erwägen Sie mögliche negative Auswirkungen neuer Technologien"
                ]
            }
        }


class DiscussionCreateRequest(BaseModel):
    """Anfrage zum Erstellen einer neuen Diskussion."""
    topic_id: str
    title: str
    description: Optional[str] = None
    initial_experts: List[str]  # Liste von Experten-IDs
    initial_question: str
    
    class Config:
        schema_extra = {
            "example": {
                "topic_id": "topic-123",
                "title": "KI und die Zukunft der Wissensarbeit",
                "description": "Analyse der Veränderungen in wissensbasierten Berufen durch KI",
                "initial_experts": ["tech-expert-1", "econ-expert-1"],
                "initial_question": "Wie werden sich wissensbasierte Berufe in den nächsten 10 Jahren durch KI verändern?"
            }
        }


class MessageCreateRequest(BaseModel):
    """Anfrage zum Hinzufügen einer Nachricht zu einer Diskussion."""
    discussion_id: str
    content: str
    sender_id: Optional[str] = None  # Optional, wenn vom Benutzer gesendet
    sender_type: str = "user"  # Standardmäßig vom Benutzer
    references: Optional[List[str]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "discussion_id": "disc-456",
                "content": "Können Sie die langfristigen Auswirkungen von KI auf kreative Berufe erläutern?",
                "sender_type": "user",
                "references": []
            }
        }


class ExpertResponseRequest(BaseModel):
    """Anfrage zur Generierung einer Expertenantwort."""
    discussion_id: str
    message_id: str  # ID der Nachricht, auf die der Experte antworten soll
    expert_id: str
    focus_points: Optional[List[str]] = None  # Spezifische Punkte, auf die der Experte eingehen soll
    
    class Config:
        schema_extra = {
            "example": {
                "discussion_id": "disc-456",
                "message_id": "msg-123",
                "expert_id": "tech-expert-1",
                "focus_points": ["technologische Machbarkeit", "zeitlicher Horizont"]
            }
        }


class DiscussionProgressRequest(BaseModel):
    """Anfrage zur Überwachung des Diskussionsfortschritts."""
    discussion_id: str
    detailed_analysis: bool = False
    focus_areas: Optional[List[str]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "discussion_id": "disc-456",
                "detailed_analysis": True,
                "focus_areas": ["bias_detection", "topic_coverage"]
            }
        } 