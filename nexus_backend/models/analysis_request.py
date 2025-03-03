from pydantic import BaseModel, Field

class AnalysisRequest(BaseModel):
    request_id: str = Field(..., min_length=1)
    payload: str = Field(..., min_length=10, max_length=5000) 