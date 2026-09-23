from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth_router, leads_router, anuncios_router, juridico_router, whatsapp_router, whatsapp_webhook_router

# Cria as tabelas no banco (em produção, o ideal é usar Alembic para migrações)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Receivly API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # endereço do front-end em dev (Vite)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(leads_router.router)
app.include_router(anuncios_router.router)
app.include_router(juridico_router.router)
app.include_router(whatsapp_router.router)
app.include_router(whatsapp_webhook_router.router)


@app.get("/")
def raiz():
    return {"status": "ok", "servico": "Receivly API"}
