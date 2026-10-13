"""Verificações básicas de segurança (rodar: python scripts/security_check.py)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402


def main() -> int:
    problemas: list[str] = []

    if settings.jwt_secret_key in ("dev-secret-change-me", "troque-isso-por-uma-string-secreta-bem-grande", ""):
        problemas.append("JWT_SECRET_KEY ainda está com valor padrão — troque no .env")

    if len(settings.jwt_secret_key) < 32:
        problemas.append("JWT_SECRET_KEY muito curta (recomendado: 32+ caracteres)")

    if settings.asaas_api_key and not settings.asaas_webhook_token:
        problemas.append("ASAAS_WEBHOOK_TOKEN vazio — webhook de pagamento fica sem autenticação")

    if not settings.asaas_sandbox and not settings.asaas_api_key:
        problemas.append("Produção Asaas sem ASAAS_API_KEY")

    print("=== Receivly — verificação de segurança ===")
    if problemas:
        for p in problemas:
            print(f"  [ALERTA] {p}")
        print(f"\n{len(problemas)} item(ns) para corrigir.")
        return 1

    print("  Nenhum alerta crítico de configuração encontrado.")
    print("  Rotas protegidas: use sempre Depends(obter_usuario_atual) nos routers.")
    print("  Pentest completo: contrate ferramenta externa (OWASP ZAP, Burp) em staging.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
