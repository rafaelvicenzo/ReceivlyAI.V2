from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.database import engine, Base
from app.migracoes import aplicar_migracoes
from app.routers import (
    auth_router,
    leads_router,
    anuncios_router,
    whatsapp_router,
    whatsapp_webhook_router,
    avaliacoes_router,
    dashboard_router,
    foto_tours_router,
    ia_test_router,
    pagamentos_router,
)

# Cria as tabelas no banco (em produção, o ideal é usar Alembic para migrações)
Base.metadata.create_all(bind=engine)
aplicar_migracoes()

app = FastAPI(title="Receivly API", version="0.1.0")


@app.exception_handler(OperationalError)
async def erro_banco_operacional(_request: Request, exc: OperationalError):
    msg = str(exc.orig) if exc.orig else str(exc)
    if "disk is full" in msg.lower() or "database or disk is full" in msg.lower():
        return JSONResponse(
            status_code=507,
            content={
                "detail": "Disco cheio: o Windows não tem espaço livre para gravar no banco. Libere espaço em C: e tente novamente.",
            },
        )
    return JSONResponse(status_code=500, content={"detail": "Erro ao acessar o banco de dados."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # endereço do front-end em dev (Vite)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

app.include_router(auth_router.router)
app.include_router(leads_router.router)
app.include_router(anuncios_router.router)
app.include_router(whatsapp_router.router)
app.include_router(whatsapp_webhook_router.router)
app.include_router(avaliacoes_router.router)
app.include_router(dashboard_router.router)
app.include_router(foto_tours_router.router)
app.include_router(ia_test_router.router)
app.include_router(pagamentos_router.router)

# Serve as fotos das avaliações (ex: /uploads/avaliacoes/3/abc123.jpg)
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/")
def raiz():
    return {"status": "ok", "servico": "Receivly API"}
