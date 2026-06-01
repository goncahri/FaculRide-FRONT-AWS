<div align="center">

![FaculRide Banner](./assets/images/banner-faculride.png)

# FaculRide — Plataforma AWS

**Sistema de caronas universitárias da FATEC Votorantim**

Node.js · Angular 18 · React Native · AWS

[![CI/CD Backend](https://github.com/devDavyRibeiro/FaculRide-BackEnd/actions/workflows/ci-main.yml/badge.svg)](https://github.com/devDavyRibeiro/FaculRide-BackEnd/actions)
[![CI/CD Frontend](https://github.com/goncahri/FaculRide-FRONT-AWS/actions/workflows/main.yml/badge.svg)](https://github.com/goncahri/FaculRide-FRONT-AWS/actions)

</div>

---

## 📖 Sobre o Projeto

O **FaculRide** é uma plataforma completa de caronas universitárias desenvolvida para conectar alunos motoristas e passageiros da FATEC Votorantim. O projeto surgiu como Projeto Integrador das disciplinas de **Computação em Nuvem I**, **Laboratório de Desenvolvimento Móvel**, **Segurança no Desenvolvimento de Aplicações** e **Programação para Dispositivos Móveis II**.

A plataforma conta com três frentes: **Web** (Angular 18), **Mobile** (React Native + Expo) e **Backend** (Node.js + Express), totalmente integradas e hospedadas na infraestrutura da **Amazon Web Services (AWS)**.

O sistema permite oferecer ou procurar caronas com agendamento por calendário, negociação via chat em tempo real, avaliação pós-viagem, upload de documentos no S3 e monitoramento completo via CloudWatch — tudo operando em produção na nuvem com CI/CD automatizado.

---

<div align="center">

![Como Funciona](./assets/images/como-funciona.png)

</div>

---

## 🏗️ Arquitetura AWS

<div align="center">

![Arquitetura FaculRide AWS](./assets/images/faculride-arquitetura.png)

> Diagrama gerado com [draw.io](https://app.diagrams.net) utilizando ícones oficiais AWS.

</div>

### Visão Geral

```
👤 Usuários (Mobile App + Web Browser)
         │
         ▼  DuckDNS (DNS dinâmico)
┌─────────────────────────────────────────────────────────┐
│                  AWS Cloud — us-east-1                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           EC2 Instâncias (IaaS)                 │    │
│  │  [EC2 Frontend]  [EC2 Backend]  [EC2 MongoDB]   │    │
│  └─────────────────────────────────────────────────┘    │
│            │             │               │              │
│            ▼             ▼               ▼              │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Serviços Gerenciados (PaaS)             │    │
│  │  [RDS PostgreSQL]  [S3 + Réplica]  [CloudWatch] │    │
│  │  [AWS Lambda]      [IAM Role]      [Secrets Mgr]│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │
         ▼  CI/CD
[GitHub Actions] → [Docker Hub] → SSH Deploy → EC2
```

---

## ☁️ Infraestrutura AWS — Detalhamento

### 🖥️ EC2 — Frontend (IaaS)

| Item | Detalhe |
|---|---|
| **AMI** | Amazon Linux 2023 |
| **Tipo** | t2.micro (Free Tier) |
| **Runtime** | Angular 18 + Nginx (dentro de container Docker) |
| **Porta exposta** | 80 (HTTP) |
| **Proxy reverso** | Nginx — serve SPA Angular com `try_files` |
| **DNS** | `http://faculride-front.duckdns.org` |
| **Deploy** | Docker Hub → `docker pull` + `docker run` via GitHub Actions |
| **Security Group** | Inbound: 80 (HTTP), 22 (SSH) · Outbound: All |

**Dockerfile (Frontend):**
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/faculride/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### ⚙️ EC2 — Backend API (IaaS)

| Item | Detalhe |
|---|---|
| **AMI** | Amazon Linux 2023 |
| **Tipo** | t2.micro (Free Tier) |
| **Runtime** | Node.js 20 + Express (Docker) |
| **Porta interna** | 3000 |
| **Porta exposta** | 80 via Nginx (proxy reverso 80 → 3000) |
| **DNS** | `http://faculride-api.duckdns.org` |
| **Swagger** | `http://faculride-api.duckdns.org/api-docs` |
| **Deploy** | Docker Hub → `docker pull` + `docker run` via GitHub Actions |
| **Security Group** | Inbound: 80, 443, 22 · Outbound: All |
| **IAM Role** | `faculride-ec2-role` com policies para S3 e CloudWatch |

**Dockerfile (Backend):**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

---

### 🍃 EC2 — MongoDB (IaaS)

| Item | Detalhe |
|---|---|
| **AMI** | Ubuntu 22.04 LTS |
| **Tipo** | t2.micro |
| **Runtime** | MongoDB 7.0 |
| **Porta** | 27017 |
| **DNS** | `faculride-mongo.duckdns.org` |
| **Uso** | Armazenamento de metadados do S3 (ETag + MIME type por usuário) |
| **Autenticação** | Usuário + senha (`authSource=admin`) |
| **Security Group** | Inbound: 27017 (backend EC2 only), 22 · Outbound: All |

**Instalação MongoDB via SSH:**
```bash
# Adicionar repositório
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
```

**Schema (Mongoose):**
```typescript
const s3ObjectSchema = new mongoose.Schema({
  idUsuario: { type: Number, required: true },
  etag:      { type: String, required: true },  // ETag do S3
  minytype:  { type: String, required: true },  // image/jpeg, CNH-image/jpeg...
});
```

---

### 🗄️ Amazon RDS — PostgreSQL (PaaS)

| Item | Detalhe |
|---|---|
| **Engine** | PostgreSQL 15 |
| **Instância** | db.t3.micro |
| **Endpoint** | `faculride-db.crvphh7em6nx.us-east-1.rds.amazonaws.com` |
| **Porta** | 5432 |
| **ORM** | Sequelize v6 + TypeScript |
| **SSL** | Habilitado (`rejectUnauthorized: false`) |
| **Backup** | Automático pela AWS (7 dias de retenção) |
| **Multi-AZ** | Desabilitado (Free Tier) |

**Tabelas gerenciadas pelo Sequelize:**

| Tabela | Descrição |
|---|---|
| `usuario` | Dados de motoristas e passageiros |
| `veiculo` | Veículos dos motoristas |
| `viagem` | Caronas cadastradas |
| `viajem_agendada` | Datas específicas de cada carona |
| `conversa_carona` | Conversas entre usuários por viagem |
| `mensagem_conversa` | Mensagens do chat |
| `avaliacao` | Avaliações pós-viagem (1–5 estrelas) |
| `notification` | Notificações em tempo real |
| `logAcesso` | Histórico de logins |
| `SequelizeMeta` | Controle de migrations |

**Rodar migrations:**
```bash
npx sequelize-cli db:migrate
```

**Zerar dados (sem apagar estrutura):**
```sql
TRUNCATE TABLE mensagem_conversa RESTART IDENTITY CASCADE;
TRUNCATE TABLE conversa_carona   RESTART IDENTITY CASCADE;
TRUNCATE TABLE viajem_agendada   RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Avaliacao"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Notification"    RESTART IDENTITY CASCADE;
TRUNCATE TABLE "logAcesso"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE veiculo           RESTART IDENTITY CASCADE;
TRUNCATE TABLE viagem            RESTART IDENTITY CASCADE;
TRUNCATE TABLE usuario           RESTART IDENTITY CASCADE;
```

---

### 🪣 Amazon S3 (PaaS)

| Item | Detalhe |
|---|---|
| **Bucket principal** | `faculride01` |
| **Bucket réplica** | `faculride01-replica` |
| **Região** | `us-east-1` |
| **ACL** | `public-read` |
| **Conteúdo** | Fotos de perfil + fotos da CNH dos motoristas |
| **URL pública** | `https://faculride01.s3.us-east-1.amazonaws.com/{key}` |
| **Replicação** | SRR (Same Region Replication) — `faculride01` → `faculride01-replica` |
| **Autenticação** | IAM Role da EC2 (sem Access Keys no código) |
| **Upload** | Multipart via `@aws-sdk/lib-storage` com chunks de 5MB |

**Fluxo de upload de foto:**
```
Frontend → POST /api/usuario/foto/upload (multipart)
  → Backend recebe com Multer (memoryStorage, max 5MB)
  → uploadArquivoS3(file) → S3 bucket faculride01
  → insertS3(idUsuario, ETag, mimetype) → MongoDB
  → UPDATE usuario SET fotoUrl = url → RDS
  → Retorna { url: "https://faculride01.s3.../filename.jpg" }
```

**Fluxo de busca de foto:**
```
GET /api/usuario/:id
  → findS3ById(idUsuario, "image/jpeg") → MongoDB (busca por ETag)
  → getArquivoS3byID(etag) → Lista objetos S3 por ETag
  → Retorna URL pública
```

---

### 📊 Amazon CloudWatch

| Item | Detalhe |
|---|---|
| **Log Group** | `api-logs` |
| **Log Stream** | `api-stream` |
| **Autenticação** | IAM Role (sem credenciais hardcoded) |
| **Integração** | Middleware global no Express — loga TODAS as requisições |
| **SDK** | `aws-sdk` — `CloudWatchLogs.putLogEvents()` |

**Estrutura do log:**
```typescript
{
  tipo:    "REQUEST",
  metodo:  "POST",
  rota:    "/api/usuario/login",
  status:  200,
  ip:      "189.xxx.xxx.xxx",
  timestamp: "2026-05-31T10:00:00.000Z"
}
```

**Middleware logger (`src/middlewares/logger.ts`):**
```typescript
import { sendLog } from '../utils/cloudwatch';

export async function logger(req: Request, res: Response, next: NextFunction) {
  await sendLog({
    tipo: 'REQUEST',
    metodo: req.method,
    rota: req.originalUrl,
    status: res.statusCode,
  });
  next();
}
```

---

### λ AWS Lambda — Serverless

| Item | Detalhe |
|---|---|
| **Função** | `faculride-email-cnh-validada` |
| **Trigger** | Invocação direta via SDK (`InvokeCommand`) |
| **Tipo** | `Event` (assíncrono — fire and forget) |
| **Finalidade** | Envio de e-mail ao motorista confirmando validação da CNH |
| **SDK** | `@aws-sdk/client-lambda` |
| **Autenticação** | IAM Role da EC2 |

```typescript
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const enviarEmailCnhValidada = async (email: string, nome: string) => {
  const lambda = new LambdaClient({ region: process.env.AWS_REGION });
  const command = new InvokeCommand({
    FunctionName: "faculride-email-cnh-validada",
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify({ email, nome }))
  });
  await lambda.send(command);
};
```

---

### 🔐 IAM Role — Segurança (Zero Trust)

O backend **não utiliza** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` hardcoded. A EC2 do backend possui uma **IAM Role** atribuída com as policies:

| Policy | Acesso concedido |
|---|---|
| `AmazonS3FullAccess` (customizado) | Upload, download e listagem no bucket `faculride01` |
| `CloudWatchLogsFullAccess` (customizado) | Escrita no Log Group `api-logs` |
| `AWSLambdaRole` | Invocar a função `faculride-email-cnh-validada` |

```typescript
// s3Client.ts — sem credenciais hardcoded
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // IAM Role da EC2 autentica automaticamente
  // credentials: { ... } ← COMENTADO intencionalmente
});
```

---

### 🔑 Secrets Manager / GitHub Secrets

Segredos sensíveis são armazenados como **GitHub Actions Secrets** e nunca expostos no repositório:

| Secret | Uso |
|---|---|
| `EC2_BACKEND_HOST` | IP da EC2 do backend |
| `EC2_BACKEND_USER` | Usuário SSH da EC2 |
| `EC2_BACKEND_SSH_KEY` | Chave privada SSH (.pem) |
| `EC2_HOST` | IP da EC2 do frontend |
| `EC2_USERNAME` | Usuário SSH da EC2 frontend |
| `EC2_SSH_KEY` | Chave privada SSH frontend |
| `EC2_PATH` | Caminho do deploy na EC2 |
| `DOCKERHUB_USERNAME` | Usuário Docker Hub |
| `DOCKER_PASSWORD` | Access Token Docker Hub |
| `GH_TOKEN` | Token GitHub para Semantic Release |

**O arquivo `.env` nunca é commitado** — está listado no `.gitignore`. Em produção, as variáveis são injetadas diretamente na EC2 via `nano .env` ou AWS Secrets Manager.

---

## 🚀 CI/CD Pipeline

### Fluxo Completo

```
Developer faz commit seguindo Conventional Commits
         │
         ▼
GitHub Actions detecta push na branch main ou develop
         │
         ├─► Semantic Release analisa commits
         │         └─► Gera nova versão (ex: 1.2.0)
         │
         ├─► Build da imagem Docker
         │         └─► docker build -t faculride-back:production-v1.2.0 .
         │
         ├─► Push para Docker Hub
         │         └─► goncahri/faculride-backend:production-latest
         │
         └─► Deploy via SSH na EC2
                   ├─► docker pull goncahri/faculride-backend:production-latest
                   ├─► docker stop faculride-backend
                   ├─► docker rm faculride-backend
                   └─► docker run -d -p 3000:3000 --name faculride-backend ...
```

### Branches e Ambientes

| Branch | Ambiente | Tag Docker | Trigger |
|---|---|---|---|
| `main` | Produção | `production-latest` + `production-vX.Y.Z` | Push + PR merged |
| `develop` | Desenvolvimento | `development-latest` + `development-vX.Y.Z` | Push |

### GitHub Actions — Backend (`ci-main.yml`)

```yaml
name: CI/CD Backend — Production

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - uses: cycjimmy/semantic-release-action@v4
        id: semantic
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}

  docker:
    needs: release
    runs-on: ubuntu-latest
    steps:
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            goncahri/faculride-backend:production-latest
            goncahri/faculride-backend:production-v${{ needs.release.outputs.version }}

  deploy:
    needs: docker
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_BACKEND_HOST }}
          username: ${{ secrets.EC2_BACKEND_USER }}
          key: ${{ secrets.EC2_BACKEND_SSH_KEY }}
          script: |
            docker pull goncahri/faculride-backend:production-latest
            docker stop faculride-backend || true
            docker rm faculride-backend || true
            docker run -d \
              --name faculride-backend \
              --restart always \
              -p 3000:3000 \
              goncahri/faculride-backend:production-latest
```

---

## 📝 Padrões de Commit (Conventional Commits)

O projeto usa **Semantic Release** com **Conventional Commits**. O formato dos commits determina automaticamente a versão gerada:

| Prefixo | Tipo | Impacto na versão |
|---|---|---|
| `feat:` | Nova funcionalidade | Minor (1.**2**.0) |
| `fix:` | Correção de bug | Patch (1.2.**1**) |
| `feat!:` ou `BREAKING CHANGE` | Mudança incompatível | Major (**2**.0.0) |
| `docs:` | Documentação | Nenhum |
| `refactor:` | Refatoração | Nenhum |
| `chore:` | Manutenção | Nenhum |
| `test:` | Testes | Nenhum |
| `ci:` | CI/CD | Nenhum |

**Exemplos:**
```bash
git commit -m "feat: adicionar sistema de chat entre motorista e passageiro"
git commit -m "fix: corrigir upload de CNH para motoristas"
git commit -m "feat!: migrar banco de dados para AWS RDS"
git commit -m "docs: atualizar README com arquitetura AWS"
```

---

## 🛠️ Tecnologias

### Backend

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express | ^4.x | Framework HTTP |
| TypeScript | ~5.x | Tipagem estática |
| Sequelize | ^6.x | ORM PostgreSQL |
| Mongoose | ^8.x | ODM MongoDB |
| Socket.IO | ^4.x | Comunicação em tempo real |
| JWT | — | Autenticação stateless |
| Bcrypt | — | Hash de senhas |
| Multer | — | Upload de arquivos (multipart) |
| @aws-sdk/client-s3 | ^3.x | Integração AWS S3 |
| @aws-sdk/lib-storage | ^3.x | Upload multipart S3 |
| @aws-sdk/client-lambda | ^3.x | Invocação Lambda |
| aws-sdk | ^2.x | CloudWatch Logs |
| Nodemailer | ^8.x | Envio de e-mails SMTP |
| Swagger UI Express | — | Documentação API |
| Docker | — | Containerização |

### Frontend Web

| Tecnologia | Versão | Uso |
|---|---|---|
| Angular | 18 | Framework SPA |
| TypeScript | — | Tipagem estática |
| Socket.IO Client | — | Notificações real-time |
| Chart.js | — | Gráficos de estatísticas |
| jsPDF + autoTable | — | Exportação PDF |
| XLSX | — | Exportação Excel |
| ngx-mask | — | Máscaras de formulário |
| Google Maps API | — | Mapa com marcadores de caronas |
| Nginx | alpine | Servidor web (container) |
| Docker | — | Containerização |

### Mobile

| Tecnologia | Versão | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework mobile |
| Expo | ~54.0 | Plataforma de build |
| Expo Router | ~6.0 | Navegação file-based |
| TypeScript | ~5.9 | Tipagem estática |
| Axios | ^1.x | Requisições HTTP |
| React Native WebView | 13.15 | Mapas Leaflet embarcados |
| Expo Image Picker | ~17.0 | Upload foto/CNH |
| AsyncStorage | 2.2.0 | Persistência local |

---

## 📋 Requisitos do PI — Computação em Nuvem I

Mapeamento dos 38 requisitos exigidos pelo professor com o status de implementação:

| # | Requisito | Status | Detalhe |
|---|---|---|---|
| 1 | Banco de dados Não Relacional | ✅ | MongoDB 7.0 em EC2 Ubuntu |
| 2 | Banco de dados Relacional RDS | ✅ | PostgreSQL 15 no AWS RDS |
| 3 | EC2 MongoDB | ✅ | EC2 Ubuntu com MongoDB instalado via SSH |
| 4 | DNS EC2 — MongoDB | ✅ | `faculride-mongo.duckdns.org` |
| 5 | Repositório API | ✅ | GitHub com CI/CD configurado |
| 6 | Repositório Frontend | ✅ | GitHub com CI/CD configurado |
| 7 | Docker Hub API | ✅ | `goncahri/faculride-backend` |
| 8 | Docker Hub Frontend | ✅ | `goncahri/faculride-frontend` |
| 9 | Deploy API | ✅ | GitHub Actions → SSH → `docker run` na EC2 |
| 10 | Deploy Frontend | ✅ | GitHub Actions → SSH → `docker run` na EC2 |
| 11 | TAG Frontend home | ✅ | Semantic Release gera versão automática |
| 12 | TAG Backend Swagger | ✅ | Versão `0.26.0-preview.1` no `/api-docs` |
| 13 | Bucket S3 | ✅ | Bucket `faculride01` em us-east-1 |
| 14 | Integração API × MongoDB | ✅ | CRUD completo (insert, find, delete, update) |
| 15 | Integração API × S3 | ✅ | Upload foto perfil + CNH via multipart |
| 16 | Integração API × RDS | ✅ | Sequelize com 10 tabelas mapeadas |
| 17 | Secrets API — S3 | ✅ | IAM Role (sem Access Keys no código) |
| 18 | Secrets API — MongoDB | ✅ | URI no `.env` / GitHub Secrets |
| 19 | Secrets API — RDS | ✅ | `DATABASE_URL` via GitHub Secrets |
| 20 | Secrets API — CloudWatch | ✅ | IAM Role (sem credenciais hardcoded) |
| 21 | Env Frontend × Backend | ✅ | URL do backend configurada nos serviços Angular |
| 22 | Integração Frontend × Backend URL | ✅ | `http://faculride-api.duckdns.org/api` |
| 23 | Funcionalidades Mongo × S3 × RDS × CloudWatch | ✅ | Todas integradas e operacionais |
| 24 | Role EC2 × S3 × CloudWatch | ✅ | IAM Role `faculride-ec2-role` sem Access Keys |
| 25 | S3 — Replicação em 2 buckets | ✅ | SRR: `faculride01` → `faculride01-replica` |
| 26 | API — DNS | ✅ | `http://faculride-api.duckdns.org` |
| 27 | Frontend — DNS | ✅ | `http://faculride-front.duckdns.org` |
| 28 | MongoDB — DNS | ✅ | `faculride-mongo.duckdns.org` |
| 29 | API — Nginx | ✅ | Nginx como proxy reverso (80 → 3000) na EC2 |
| 30 | Frontend — Nginx | ✅ | Nginx serve SPA Angular no container Docker |
| 31 | MongoDB — Nginx | ✅ | Nginx na EC2 MongoDB gerenciando acesso |
| 32 | API (Mongo/RDS/S3) — Documentação | ✅ | Swagger `/api-docs` + este README |
| 33 | API — DuckDNS com IP atualizado | ✅ | DNS dinâmico configurado e ativo |
| 34 | Frontend — DuckDNS com IP atualizado | ✅ | DNS dinâmico configurado e ativo |
| 35 | MongoDB — DuckDNS com IP atualizado | ✅ | DNS dinâmico configurado e ativo |
| 36 | Frontend — Documentação | ✅ | Este README |
| 37 | Arquitetura — Documentação | ✅ | Diagrama draw.io + imagem no README |
| 38 | Serverless | ✅ | Lambda `faculride-email-cnh-validada` (SES/SMTP) |

---

## ✨ Funcionalidades do Sistema

### Autenticação e Usuários
- Cadastro como **motorista** ou **passageiro** com validações completas
- Login com **JWT** (expiração: 1 dia)
- Senhas criptografadas com **bcrypt** (10 rounds)
- Recuperação de dados de sessão via `localStorage` / `AsyncStorage`
- Upload de **foto de perfil** (JPG/PNG/WEBP, max 5MB) → S3
- Upload de **foto da CNH** para motoristas → S3

### Caronas (Web e Mobile)
- **Oferecer carona** (motorista): origem, destino, horários, custo mensal
- **Procurar carona** (passageiro): mesmos dados
- **Calendário manual**: seleção de dias específicos do mês
- **Modo Semestre**: preenchimento automático de todos os dias úteis (Seg–Sáb)
- Cancelamento de carona pelo motorista
- Visualização no **mapa** (Google Maps no web, Leaflet no mobile)

### Chat e Negociação
- **Chat em tempo real** entre motorista e passageiro por viagem
- Fluxo de aceitação: ambos devem aceitar para confirmar
- Estados da conversa: `pendente → aguardando_confirmacao → aceita → concluída`
- Polling automático (3 segundos no mobile, 5 segundos no web)
- Socket.IO para notificações em tempo real

### Avaliações
- Sistema de **estrelas (1–5)** com comentário obrigatório
- Avaliação automática após conclusão da viagem
- Histórico de avaliações enviadas e recebidas
- Notificação em tempo real ao ser avaliado

### Infraestrutura e Monitoramento
- **CloudWatch**: log de todas as requisições (método, rota, status, IP)
- **Notificações push** via Socket.IO
- **Exportação** de caronas em PDF e Excel (web)
- **Estatísticas públicas** na home (Chart.js): total de motoristas vs passageiros, média de avaliações

---

## 🔗 URLs de Produção

| Serviço | URL |
|---|---|
| 🌐 **Frontend Web** | http://faculride-front.duckdns.org |
| ⚙️ **Backend API** | http://faculride-api.duckdns.org/api |
| 📑 **Swagger (API Docs)** | http://faculride-api.duckdns.org/api-docs |
| 🍃 **MongoDB** | faculride-mongo.duckdns.org:27017 |
| 🪣 **S3 (fotos)** | https://faculride01.s3.us-east-1.amazonaws.com |
| 📊 **CloudWatch** | AWS Console → us-east-1 → Log Group: api-logs |

---

## ⚙️ Variáveis de Ambiente (`.env`)

```env
# Ambiente
NODE_ENV=production

# Banco de Dados Relacional (RDS)
DATABASE_URL=postgresql://postgres:SENHA@faculride-db.crvphh7em6nx.us-east-1.rds.amazonaws.com:5432/faculride

# MongoDB (EC2)
MONGODB_URI_USER=mongodb://USUARIO:SENHA@
MONGODB_HOST_PROD=IP_PRIVADO_EC2_MONGO
MONGODB_URI_END=:27017/?authSource=admin

# AWS
AWS_REGION=us-east-1
BUCKET_NAME=faculride01

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# E-mail (Brevo/SMTP)
BREVO_API_KEY=sua_chave
BREVO_SENDER_EMAIL=noreply@faculride.com.br

# URL base (opcional)
BASE_URL=http://faculride-api.duckdns.org/api
```

> ⚠️ **NUNCA** commitar o `.env` real. Está no `.gitignore`. Em produção, editar diretamente na EC2 via `sudo nano .env`.

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- Node.js 20+
- PostgreSQL (ou apontar para o RDS)
- MongoDB (local ou EC2)
- Conta AWS (para S3 e CloudWatch)

### Backend

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/faculride-back.git
cd faculride-back

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env-exemple .env
# editar .env com suas credenciais

# Rodar migrations
npx sequelize-cli db:migrate

# Iniciar em desenvolvimento
npm run dev

# A API estará disponível em:
# http://localhost:3000/api
# http://localhost:3000/api-docs (Swagger)
```

### Frontend Web

```bash
git clone https://github.com/seu-usuario/faculride-front.git
cd faculride-front

npm install
ng serve

# Disponível em http://localhost:4200
```

### Mobile

```bash
git clone https://github.com/seu-usuario/faculride-mobile.git
cd faculride-mobile

npm install
npx expo start

# Android: npx expo start --android
# iOS:     npx expo start --ios
```

---

## 🚀 Deploy em Produção (Manual)

### 1. Preparar a EC2

```bash
# Instalar Docker na EC2 (Amazon Linux)
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -aG docker ec2-user
sudo systemctl enable docker

# Instalar Nginx
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Deploy do Backend via Docker

```bash
# Na EC2 do backend
docker pull goncahri/faculride-backend:production-latest
docker stop faculride-backend || true
docker rm faculride-backend || true
docker run -d \
  --name faculride-backend \
  --restart always \
  -p 3000:3000 \
  goncahri/faculride-backend:production-latest
```

### 3. Configurar Nginx (proxy reverso — backend)

```nginx
server {
    listen 80;
    server_name faculride-api.duckdns.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. DuckDNS — Atualizar IP

```bash
# Cron job para manter o DNS atualizado (a cada 5 minutos)
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=faculride-api&token=SEU_TOKEN&ip=" > /var/log/duckdns.log
```

---

## 📦 Repositórios e Docker Hub

| Componente | GitHub | Docker Hub |
|---|---|---|
| **Backend** | [FaculRide-BackEnd](https://github.com/devDavyRibeiro/FaculRide-BackEnd) | [ryancnp/faculride-back](https://hub.docker.com/r/ryancnp/faculride-back) |
| **Frontend Web** | [FaculRide-FRONT-AWS](https://github.com/goncahri/FaculRide-FRONT-AWS) | [goncahri/faculride-frontend](https://hub.docker.com/r/goncahri/faculride-frontend) |
| **Mobile** | [faculride-mobile](https://github.com/devDavyRibeiro/faculride-mobile) | — |

---

## 👥 Equipe

| Nome | RA |
|---|---|
| Breno Jose Da Silva | 3011392413025 |
| Davy Oliveira Ribeiro | — |
| Gabriel Ribeiro Correa | 3011392413032 |
| Herivelton Henrique Gonçalves | 3011392413011 |
| Pedro Silva Martins | — |
| Ryan Carlo Negretti Pereira | — |

---

<div align="center">

Desenvolvido com 💙 para a **FATEC Votorantim**

Projeto Integrador — Computação em Nuvem I · Laboratório de Desenvolvimento Móvel · 2026

</div>
