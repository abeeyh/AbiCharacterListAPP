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
| `MONGODB_URI` | `mongodb+srv://USER:PASSWORD@HOST/?retryWrites=true&w=majority` | Production, Preview, Development |
| `ABI_JWT_SECRET` | uma string com 32 caracteres | Production, Preview, Development |

**MONGODB_URI**: use a connection string do [MongoDB Atlas](https://cloud.mongodb.com) (cluster conectado ao projeto Hollywood Purple Filter).

**ABI_JWT_SECRET**: gere um segredo forte, ex: `openssl rand -hex 16`

## 4. Deploy

Após salvar as configurações, faça um novo deploy (push no repositório ou **Redeploy** no dashboard).

## Migrations do banco

As migrations (`npm run db:migrate`) criam índices no MongoDB. Execute antes do primeiro deploy:

```bash
cd next-app
npm run db:migrate
npm run db:seed   # cria usuário admin (abi / apenas1senha)
```

### Migrar dados do Neon (PostgreSQL) para MongoDB

Se você já tem dados no Neon e quer migrar para MongoDB:

1. Configure `.env.local` com `DATABASE_URL` (Neon) e `MONGODB_URI` (MongoDB)
2. Execute: `npm run db:migrate-from-neon`
