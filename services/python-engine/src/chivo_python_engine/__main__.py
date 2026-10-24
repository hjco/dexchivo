import uvicorn

from .config import EngineSettings


def main() -> None:
    settings = EngineSettings()
    uvicorn.run(
        "chivo_python_engine.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
        reload=settings.reload,
    )


if __name__ == "__main__":
    main()
