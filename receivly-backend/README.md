# Receivly API (Backend)

Backend em Python/FastAPI do Receivly. Substitui os dados mockados do front-end
por autenticação real, banco de dados e uma chamada de IA de verdade (gerador
de anúncios via Claude).

## O que já está pronto

- Cadastro e login de imobiliária/corretor com senha criptografada (bcrypt) e token JWT.
- CRUD de leads, isolado por imobiliária (cada conta só vê os próprios leads).
- Gerador de anúncios chamando a API da Anthropic de verdade (`/anuncios/gerar`).
- Banco SQLite pronto pra rodar local, sem precisar instalar Postgres agora.
  Quando for pra produção, basta trocar `DATABASE_URL` no `.env` pela URL do
  Postgres (ex: de um projeto no Supabase) — o resto do código não muda.

## O que ainda falta (próximos módulos)

- Webhook real do WhatsApp (Meta Cloud API ou Twilio) + lógica de conversa com IA.
- Upload e análise de documentos (Analisador Jurídico).
- Geração de vídeo (Video Tours).
- Alembic para migrações de banco (hoje as tabelas são criadas automaticamente).

## Como rodar localmente

1. Crie um ambiente virtual e instale as dependências:

   ```bash
   cd receivly-backend
   python -m venv venv
   venv\Scripts\activate        # Windows
   # source venv/bin/activate   # Mac/Linux
   pip install -r requirements.txt
   ```

2. Copie o `.env.example` para `.env` e preencha sua chave da Anthropic:

   ```bash
   copy .env.example .env        # Windows
   # cp .env.example .env        # Mac/Linux
   ```

3. Suba o servidor:

   ```bash
   uvicorn app.main:app --reload
   ```

4. Acesse a documentação interativa (gerada automaticamente) em:
   `http://127.0.0.1:8000/docs` — dá pra testar todos os endpoints por ali,
   sem precisar do front-end.

## Endpoints principais

| Método | Rota               | Descrição                                    |
|--------|---------------------|-----------------------------------------------|
| POST   | `/auth/registrar`   | Cria a imobiliária + primeiro usuário         |
| POST   | `/auth/login`        | Login (retorna token JWT)                     |
| GET    | `/auth/me`           | Dados do usuário autenticado                  |
| GET    | `/leads/`            | Lista os leads da imobiliária logada          |
| POST   | `/leads/`            | Cria um lead                                   |
| PATCH  | `/leads/{id}`        | Atualiza um lead                               |
| POST   | `/anuncios/gerar`    | Gera os 3 textos de anúncio via IA (Claude)   |

Todas as rotas exceto `/auth/registrar` e `/auth/login` exigem o header:
`Authorization: Bearer <token>`.

## Conectando com o front-end (React)

No front-end, troque as chamadas que hoje usam `LEADS` mockado por `fetch`
para essa API, guardando o token retornado no login (em memória/estado do
React — evite localStorage se puder, por segurança). Exemplo:

```js
const resp = await fetch("http://localhost:8000/leads/", {
  headers: { Authorization: `Bearer ${token}` }
});
const leads = await resp.json();
```

Lembre de manter o CORS do `app/main.py` apontando para a URL certa do seu
front-end (`allow_origins`).
