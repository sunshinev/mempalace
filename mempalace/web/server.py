"""
server.py — FastAPI routes for MemPalace Web UI.

Page routes serve Jinja2 templates.
API routes call mcp_server.py tool functions and return JSON.
"""

import os

from fastapi import FastAPI, Request, Query
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from mempalace.mcp_server import (
    tool_status,
    tool_list_wings,
    tool_list_rooms,
    tool_get_taxonomy,
    tool_search,
    tool_check_duplicate,
    tool_add_drawer,
    tool_delete_drawer,
    tool_graph_stats,
    tool_traverse_graph,
    tool_find_tunnels,
    tool_kg_query,
    tool_kg_add,
    tool_kg_invalidate,
    tool_kg_timeline,
    tool_kg_stats,
    tool_diary_write,
    tool_diary_read,
    tool_room_drawers,
)

_templates_dir = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=_templates_dir)


def register_routes(app: FastAPI):
    """Register all page and API routes on the FastAPI app."""

    # ── Page Routes ─────────────────────────────────────────────

    @app.get("/")
    async def index():
        return RedirectResponse(url="/dashboard", status_code=302)

    @app.get("/dashboard")
    async def dashboard(request: Request):
        return templates.TemplateResponse(request, "dashboard.html", {"active": "dashboard"})

    @app.get("/palace")
    async def palace(request: Request):
        return templates.TemplateResponse(request, "palace.html", {"active": "palace"})

    @app.get("/kg")
    async def kg(request: Request):
        return templates.TemplateResponse(request, "kg.html", {"active": "kg"})

    @app.get("/search")
    async def search_page(request: Request):
        return templates.TemplateResponse(request, "search.html", {"active": "search"})

    @app.get("/diary")
    async def diary(request: Request):
        return templates.TemplateResponse(request, "diary.html", {"active": "diary"})

    # ── JSON API Routes ─────────────────────────────────────────

    @app.get("/api/status")
    async def api_status():
        return JSONResponse(tool_status())

    @app.get("/api/taxonomy")
    async def api_taxonomy():
        return JSONResponse(tool_get_taxonomy())

    @app.get("/api/wings")
    async def api_wings():
        return JSONResponse(tool_list_wings())

    @app.get("/api/rooms")
    async def api_rooms(wing: str = Query(None)):
        return JSONResponse(tool_list_rooms(wing=wing))

    @app.get("/api/search")
    async def api_search(
        q: str = Query(...),
        wing: str = Query(None),
        room: str = Query(None),
        limit: int = Query(5),
    ):
        return JSONResponse(tool_search(query=q, limit=limit, wing=wing, room=room))

    @app.get("/api/room/drawers")
    async def api_room_drawers(
        wing: str = Query(...),
        room: str = Query(...),
        limit: int = Query(50),
    ):
        return JSONResponse(tool_room_drawers(wing=wing, room=room, limit=limit))

    @app.get("/api/check-duplicate")
    async def api_check_duplicate(
        content: str = Query(...),
        threshold: float = Query(0.9),
    ):
        return JSONResponse(tool_check_duplicate(content=content, threshold=threshold))

    @app.get("/api/graph/stats")
    async def api_graph_stats():
        return JSONResponse(tool_graph_stats())

    @app.get("/api/graph/traverse")
    async def api_graph_traverse(
        room: str = Query(...),
        max_hops: int = Query(2),
    ):
        return JSONResponse(tool_traverse_graph(start_room=room, max_hops=max_hops))

    @app.get("/api/graph/tunnels")
    async def api_graph_tunnels(
        wing_a: str = Query(None),
        wing_b: str = Query(None),
    ):
        return JSONResponse(tool_find_tunnels(wing_a=wing_a, wing_b=wing_b))

    @app.get("/api/kg/stats")
    async def api_kg_stats():
        return JSONResponse(tool_kg_stats())

    @app.get("/api/kg/query")
    async def api_kg_query(
        entity: str = Query(...),
        as_of: str = Query(None),
        direction: str = Query("both"),
    ):
        return JSONResponse(tool_kg_query(entity=entity, as_of=as_of, direction=direction))

    @app.get("/api/kg/timeline")
    async def api_kg_timeline(entity: str = Query(None)):
        return JSONResponse(tool_kg_timeline(entity=entity))

    @app.post("/api/drawer")
    async def api_add_drawer(request: Request):
        body = await request.json()
        return JSONResponse(
            tool_add_drawer(
                wing=body["wing"],
                room=body["room"],
                content=body["content"],
                source_file=body.get("source_file"),
                added_by=body.get("added_by", "web"),
            )
        )

    @app.delete("/api/drawer/{drawer_id:path}")
    async def api_delete_drawer(drawer_id: str):
        return JSONResponse(tool_delete_drawer(drawer_id=drawer_id))

    @app.post("/api/kg/add")
    async def api_kg_add(request: Request):
        body = await request.json()
        return JSONResponse(
            tool_kg_add(
                subject=body["subject"],
                predicate=body["predicate"],
                object=body["object"],
                valid_from=body.get("valid_from"),
                source_closet=body.get("source_closet"),
            )
        )

    @app.post("/api/kg/invalidate")
    async def api_kg_invalidate(request: Request):
        body = await request.json()
        return JSONResponse(
            tool_kg_invalidate(
                subject=body["subject"],
                predicate=body["predicate"],
                object=body["object"],
                ended=body.get("ended"),
            )
        )

    @app.post("/api/diary/write")
    async def api_diary_write(request: Request):
        body = await request.json()
        return JSONResponse(
            tool_diary_write(
                agent_name=body["agent_name"],
                entry=body["entry"],
                topic=body.get("topic", "general"),
            )
        )

    @app.get("/api/diary/read")
    async def api_diary_read(
        agent: str = Query(...),
        last_n: int = Query(10),
    ):
        return JSONResponse(tool_diary_read(agent_name=agent, last_n=last_n))
