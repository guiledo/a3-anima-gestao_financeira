# 🚀 Relatório de Entrega: Sistema de Gestão Financeira A3

Este documento detalha todas as funcionalidades, níveis de acesso e credenciais do sistema **A3 Store - Gestão Financeira**, desenvolvido com as melhores práticas de segurança e design moderno.

---

## 🔑 1. Credenciais de Acesso

O sistema utiliza autenticação baseada em perfis. Abaixo estão as credenciais padrão para testes e administração.

### 🛡️ Nível: Superusuário (Acesso Total)
| Usuário | Senha | Descrição |
| :--- | :--- | :--- |
| `a3_admin_2026` | `gestaofinanceira2026` | Acesso completo ao sistema, incluindo gestão de usuários e ferramentas de infraestrutura. |

### 👥 Nível: Usuário de Teste (Vendedor/Operacional)
Foram pré-cadastrados **6 usuários** para simulação de uso concorrente:
- **Logins:** `usuario1`, `usuario2`, `usuario3`, `usuario4`, `usuario5`, `usuario6`
- **Senha Padrão:** `senha123`
- **Perfil:** `USER` (Vendedor)

### 🗄️ Infraestrutura (Banco de Dados)
- **Tecnologia:** PostgreSQL (Hospedado no Supabase)
- **Senha do Banco (DB_PASSWORD):** `UfL8!7T3x60px5`

---

## 🖥️ 2. Guia de Telas e Funcionalidades

O sistema foi desenhado como uma **Single Page Application (SPA)**, oferecendo uma experiência fluida e rápida.

### 📊 Dashboard (Painel Executivo)
*A "Home" do sistema, focada em tomada de decisão.*
- **KPIs em Tempo Real:** Visualização dinâmica de Saldo Total, Valor em Estoque, Total de Vendas e Despesas.
- **Gráfico de Evolução:** Gráfico de linhas mostrando a tendência de entradas vs. saídas.
- **Gráfico de Balanço:** Gráfico de rosca para visualização percentual da saúde financeira.
- **Botão de Atualização:** Sincronização manual com o banco de dados.

### 📦 Módulo de Produtos
*Gestão completa do inventário da loja.*
- **Listagem Dinâmica:** Tabela com filtros automáticos e indicadores de status (Ativo/Inativo).
- **Cadastro e Edição:** Modal intuitivo para gerenciar Nome, Categoria, Preço de Custo, Preço de Venda e Nível de Estoque.
- **Controle de Estoque:** Atualização automática conforme movimentações são registradas.

### 🤝 Módulo de Clientes (CRM)
*Base de dados para relacionamento e faturamento.*
- **Cadastro de Clientes:** Armazenamento de Nome, CPF/CNPJ, E-mail e Telefone.
- **Vinculação:** Possibilidade de vincular clientes às movimentações financeiras.

### 💸 Movimentações Financeiras
*O coração do controle de fluxo de caixa.*
- **Feed de Atividades:** Visualização em estilo "timeline" para fácil leitura cronológica.
- **Registro de Entradas/Saídas:** Suporte a diferentes tipos de pagamento (À vista, Parcelado, Pix, etc).
- **Categorização:** Classificação por tipos (Vendas, Fornecedores, Despesas Operacionais).

### 📈 Relatórios Avançados
*Extração de inteligência de dados.*
- **Filtro por Período:** Seleção de datas para análise de performance.
- **Relatório Financeiro:** Resumo detalhado de lucratividade e fluxo de caixa por intervalo.
- **Relatório de Produtos:** Visão analítica de giro de estoque e produtos mais rentáveis.

### 👤 Gestão de Usuários
*Controle de acesso granular (Restrito a Superusuário).*
- **Criação de Contas:** Cadastro de novos funcionários com definição de perfil (USER, ADMIN, SUPERUSER).
- **Controle de Status:** Possibilidade de ativar ou desativar acessos instantaneamente.
- **Segurança:** O sistema impede que o último superusuário ativo seja desativado, garantindo que o sistema nunca fique sem administrador.

### 🕒 Histórico e Logs
*Transparência e auditoria.*
- **Timeline de Auditoria:** Rastro de todas as movimentações feitas no sistema.
- **Console de Erros:** Área técnica para monitoramento de saúde do sistema e debug em tempo real.
- **Exportação CSV:** Ferramenta para baixar os dados da timeline para uso em Excel ou BI.

### 🛠️ Ferramentas do Desenvolvedor (Infraestrutura)
*Visão técnica da stack.*
- **Status do Banco:** Verificação de latência e conexão com o Supabase.
- **Endpoints:** Documentação viva dos caminhos da API REST.
- **Logs SQL:** Monitoramento das queries executadas no banco para auditoria de performance.

---

## 🎨 3. Diferenciais Técnicos
1. **Design Glassmorphism:** Interface moderna com transparências, borrões de fundo e animações de partículas em tempo real (Canvas API).
2. **Resiliência:** Configuração de pool de conexões (HikariCP) otimizada para banco de dados em nuvem.
3. **Segurança:** Senhas criptografadas com BCrypt e controle de sessão robusto.
4. **Interatividade:** Uso de Toasts para feedback de ações e Modais para evitar recarregamento de página.

---
**Data da Entrega:** 30 de Abril de 2026
**Equipe Responsável:** A3 Desenvolvimento de Sistemas
