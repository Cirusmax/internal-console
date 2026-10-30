# Internal Console

Painel interno de controle financeiro (receitas, despesas e indicadores), com autenticação e persistência de dados.

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No painel do projeto, vá em **SQL Editor** > **New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria a tabela `transactions` já com as regras de segurança (cada usuário só vê os próprios lançamentos).
3. Vá em **Project Settings > API** e copie:
   - **Project URL**
   - **anon / publishable key**
4. Em **Authentication > Sign In / Providers**, desative **Confirm email** (uso interno, sem necessidade de confirmação por email).
5. Ainda no **SQL Editor**, rode também [`supabase/migration_002_shared_recurring_audit.sql`](supabase/migration_002_shared_recurring_audit.sql) — deixa os lançamentos compartilhados entre todos os usuários logados (em vez de privados por conta), cria o log de atividade e os lançamentos recorrentes.
6. Rode [`supabase/migration_003_clients_installments.sql`](supabase/migration_003_clients_installments.sql) — cria o cadastro de clientes e o controle de parcelamento de contratos.
7. Rode [`supabase/migration_004_down_payment.sql`](supabase/migration_004_down_payment.sql) — adiciona suporte a "entrada" nas cobranças de cliente.
8. Por fim, rode [`supabase/migration_005_down_payment_label.sql`](supabase/migration_005_down_payment_label.sql) — ajusta o texto do lançamento gerado ao confirmar uma entrada.
9. Rode [`supabase/migrations/20261029221711_client_archiving_and_sub_judice.sql`](supabase/migrations/20261029221711_client_archiving_and_sub_judice.sql) antes de publicar a nova versão — adiciona arquivamento de clientes e cobranças sob judice.

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

- `src/pages` — telas (Login, Dashboard, Lançamentos, Recorrentes, Atividade)
- `src/components` — componentes reutilizáveis (cards, tabela, modais, gráficos)
- `src/styles/tokens.css` — variáveis de design (cores, fonte, sombras, radius)
- `src/styles/app.css` — layout do sistema (sidebar, tabelas, formulários)
- `supabase/schema.sql` — definição da tabela `transactions` e políticas de segurança (RLS)
- `supabase/migration_002_shared_recurring_audit.sql` — livro-caixa compartilhado, log de atividade (`activity_log`) e regras recorrentes (`recurring_rules`)

## Lançamentos recorrentes

Cadastrados em **Recorrentes** (valor, categoria, dia do mês). Não existe servidor rodando 24h, então a geração acontece no navegador: quando qualquer usuário logado abre o app e ainda não existe o lançamento do mês pra uma regra ativa, ele é criado na hora. Um índice único no banco impede duplicar caso dois usuários abram o app ao mesmo tempo.

## Atividade e exclusões

Toda criação/edição/exclusão de lançamento é registrada automaticamente (por trigger no banco, não dá pra burlar pelo app) e fica visível em **Atividade**. Ao excluir um lançamento criado por outra pessoa, aparece um aviso identificando quem criou antes de confirmar.

## Clientes e parcelamento

Em **Clientes**, cadastre o cliente e depois uma "cobrança" (valor total + nº de parcelas + vencimento da 1ª parcela) — o sistema gera as parcelas mensais sozinho. Elas ficam como "pendente" (ou "vencida", se passar do prazo) e **não contam no saldo/dashboard** até serem confirmadas. Ao clicar "Marcar como pago", a parcela vira um lançamento de receita de verdade (com toda a autoria/auditoria de sempre); "Desfazer" reverte isso.

Na aba **Clientes**, use **Colocar sob judice** na cobrança para identificar as parcelas em aberto como **Sob judice**, em vez de vencidas/pendentes. É possível retirar a marcação depois; pagamentos, vencimentos e o total a receber são preservados. Parcelas já pagas continuam como **Pago**.

**Excluir cobrança** pede confirmação e exclui a cobrança e suas parcelas, preservando receitas já confirmadas no livro-caixa. Para guardar o histórico de clientes quitados, use **Arquivar**. O filtro **Arquivados** permite consultar todo o histórico e **Restaurar** para a lista de ativos. Quite as parcelas antes de arquivar; restaure o cliente antes de registrar novas cobranças ou desfazer pagamentos. O backup inclui os novos campos automaticamente.

## Recibos em PDF

Em **Clientes**, cada parcela paga (inclusive entrada e clientes arquivados) oferece **Baixar recibo**. O PDF inclui logomarca, fonte Questrial, nome do cliente, valor recebido, data efetiva do lançamento, contrato, parcela, usuário emissor e referência ao pagamento. A emissão consulta novamente o pagamento e só permite baixar quando a receita vinculada continua confirmada e corresponde ao valor da parcela. O arquivo pode ser encaminhado ao cliente pelo canal desejado. Gerar um recibo não altera os dados financeiros.

## Relatório em PDF

No **Dashboard**, em "Relatório de movimentações": escolha um intervalo de datas (ou marque "Todo o período" pra pegar tudo que já existe) e clique "Exportar PDF". Gera um relatório com a tabela de todas as entradas e saídas do período, totais de receita/despesa/saldo, e uma conclusão em texto (saldo do período, maior categoria de despesa etc.) calculada a partir dos próprios dados.

## Backup (exportar/importar JSON)

Em **Backup**: "Baixar backup" exporta todas as tabelas (clientes, cobranças, parcelas, recorrentes, lançamentos e o log de atividade) num único arquivo `.json`. "Importar" lê esse arquivo e restaura os dados via *upsert* — registros com o mesmo ID são atualizados, os demais são criados; nada é apagado automaticamente. O log de Atividade é exportado só como referência (não é reimportável, é só um histórico). Lançamentos restaurados por importação aparecem com a autoria de quem importou, não a autoria original.

## Deploy (GitHub Pages)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda e publica automaticamente no GitHub Pages a cada push na branch `main`.

Configuração necessária, uma única vez:

1. **Settings → Secrets and variables → Actions → New repository secret**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Build and deployment → Source**: escolha **GitHub Actions**.
3. Faça push na branch `main` — o site fica disponível em `https://<usuario>.github.io/<repositorio>/`.

O app usa `HashRouter` (URLs com `#/`) para funcionar corretamente no GitHub Pages sem configuração extra de servidor.
