# Deploy no Vercel

## 1. Conectar o repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New** → **Project**
3. Importe o repositório Git

## 2. Configurar Root Directory

O app Next.js está na pasta `next-app/`. Configure:

- **Project Settings** → **General** → **Root Directory**
- Clique em **Edit** e defina: `next-app`
- Clique em **Save**

## 3. Variáveis de ambiente

Em **Project Settings** → **Environment Variables**, adicione:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` | Production, Preview, Development |
| `ABI_JWT_SECRET` | uma string com 32 caracteres | Production, Preview, Development |

**DATABASE_URL**: use a connection string do [Neon](https://console.neon.tech) (com pooler, termina em `-pooler`).

**ABI_JWT_SECRET**: gere um segredo forte, ex: `openssl rand -hex 16`

## 4. Deploy

Após salvar as configurações, faça um novo deploy (push no repositório ou **Redeploy** no dashboard).

## Migrations do banco

As migrations (`npm run db:migrate`) e seeds (`npm run db:seed`) rodam **localmente**. Execute antes do primeiro deploy:

```bash
cd next-app
npm run db:migrate
npm run db:seed   # se precisar de dados iniciais
```
