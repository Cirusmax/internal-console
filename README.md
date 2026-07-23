# Internal Console

Painel interno de controle financeiro (receitas, despesas e indicadores), com autenticação e persistência de dados.

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No painel do projeto, vá em **SQL Editor** > **New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria a tabela `transactions` já com as regras de segurança (cada usuário só vê os próprios lançamentos).
3. Vá em **Project Settings > API** e copie:
   - **Project URL**
   - **anon / publishable key**
4. Em **Authentication > Sign In / Providers**, desative **Confirm email** (uso interno, sem necessidade de confirmação por email).

## 2. Configurar o projeto localmente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores copiados no passo anterior.

## 3. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse a URL que o Vite mostrar (geralmente `http://localhost:5173`). Na primeira vez, clique em "Criar conta" para cadastrar o usuário.

## Estrutura

- `src/pages` — telas (Login, Dashboard, Lançamentos)
- `src/components` — componentes reutilizáveis (cards, tabela, modal, gráficos)
- `src/styles/tokens.css` — variáveis de design (cores, fonte, sombras, radius)
- `src/styles/app.css` — layout do sistema (sidebar, tabelas, formulários)
- `supabase/schema.sql` — definição da tabela `transactions` e políticas de segurança (RLS)

## Deploy (GitHub Pages)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda e publica automaticamente no GitHub Pages a cada push na branch `main`.

Configuração necessária, uma única vez:

1. **Settings → Secrets and variables → Actions → New repository secret**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Build and deployment → Source**: escolha **GitHub Actions**.
3. Faça push na branch `main` — o site fica disponível em `https://<usuario>.github.io/<repositorio>/`.

O app usa `HashRouter` (URLs com `#/`) para funcionar corretamente no GitHub Pages sem configuração extra de servidor.
