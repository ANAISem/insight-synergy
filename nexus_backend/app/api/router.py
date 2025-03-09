from fastapi import APIRouter
from .endpoints import nexus, documents, search, knowledge

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