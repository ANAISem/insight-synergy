from fastapi import APIRouter
from .endpoints import mistral, nexus

router = APIRouter()

# Mistral-Endpunkte
router.include_router(
    mistral.router,
    prefix="/mistral",
    tags=["mistral"],
)

# Nexus-Endpunkte
router.include_router(
    nexus.router,
    prefix="/nexus",
    tags=["nexus"],
) 