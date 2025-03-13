from fastapi import APIRouter
from .endpoints import nexus, documents, search, knowledge, cognitive
from .endpoints.live_expert_debate import live_expert_debate_router
from .endpoints.cognitive import experts_router

router = APIRouter()

# Nexus-Endpunkte
router.include_router(
    nexus.router,
    prefix="/nexus",
    tags=["nexus"],
)

# Such-Endpunkte
router.include_router(
    search.router,
    prefix="/search",
    tags=["search"],
)

# Wissens-Endpunkte
router.include_router(
    knowledge.router,
    prefix="/knowledge",
    tags=["knowledge"],
)

# Dokument-Endpunkte
router.include_router(
    documents.router,
    prefix="/documents",
    tags=["documents"],
)

# KI-Debatte-Endpunkte
router.include_router(
    cognitive.router,
    prefix="/cognitive",
    tags=["cognitive-loop"],
)

# Experten-Endpunkte für die KI-Debatte
router.include_router(
    experts_router,
    prefix="/cognitive",
    tags=["experts"],
)

# Live-Expert-Debatte-Endpunkte
router.include_router(
    live_expert_debate_router,
    prefix="/live-expert-debate",
    tags=["live-expert-debate"],
) 