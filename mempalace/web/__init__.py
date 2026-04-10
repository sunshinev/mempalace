"""
MemPalace Web UI — Browser-based palace visualization and management.

Install: pip install mempalace[web]
Launch:  mempalace web [--port 8765] [--palace /path/to/palace]
"""


def create_app(palace_path: str = None):
    """Create and configure the FastAPI application."""
    try:
        from fastapi import FastAPI
        from fastapi.staticfiles import StaticFiles
    except ImportError:
        raise ImportError(
            "Web UI requires extra dependencies. "
            "Install with: pip install mempalace[web]\n"
            "Web UI 需要额外依赖。"
            "安装方式: pip install mempalace[web]"
        )

    import os

    if palace_path:
        os.environ["MEMPALACE_PALACE_PATH"] = os.path.abspath(palace_path)

    app = FastAPI(title="MemPalace Web UI", version="1.0.0")

    # Mount static files
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(static_dir, exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Register routes
    from .server import register_routes

    register_routes(app)

    return app
