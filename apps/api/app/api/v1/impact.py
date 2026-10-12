from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.call_graph import CallGraph
from app.schemas.call_graph import CallGraphResponse

router = APIRouter(prefix="/impact", tags=["impact"])


@router.get("/{scan_id}", response_model=CallGraphResponse)
async def get_scan_impact_graph(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Returns React Flow impact graph nodes and animated dependency edges."""
    result = await db.execute(select(CallGraph).where(CallGraph.scan_id == scan_id))
    graph = result.scalars().first()
    if not graph:
        # Return empty valid structure if graph not yet generated
        return CallGraphResponse(
            scan_id=scan_id,
            nodes=[],
            edges=[],
            affected_modules=[],
            sensitive_touchpoints=[]
        )

    return CallGraphResponse(
        scan_id=graph.scan_id,
        nodes=graph.nodes or [],
        edges=graph.edges or [],
        affected_modules=graph.affected_modules or [],
        sensitive_touchpoints=graph.sensitive_touchpoints or []
    )
