# Sistemas Distribuídos no Projeto A3 Gestão Financeira
## Artigo Técnico-Acadêmico

**Disciplina:** Sistemas Distribuídos  
**Projeto:** A3 Anima — Sistema de Gestão Financeira  
**Tecnologias:** Java 17 · Spring Boot 3 · PostgreSQL · Supabase · JavaScript Vanilla  

---

## 1. Introdução

Um **sistema distribuído** é aquele em que componentes de hardware e software localizados em computadores em rede se comunicam e coordenam suas ações apenas por meio de troca de mensagens. Tanenbaum e Van Steen (2017) definem que um sistema distribuído aparece para seus usuários como um único sistema coerente.

O projeto A3 Gestão Financeira é um exemplo prático e didático dessa definição. Embora o usuário veja uma única interface no navegador, na realidade três sistemas distintos colaboram de forma invisível: o **cliente** (navegador com HTML/CSS/JS), o **servidor de aplicação** (Spring Boot em Java) e o **banco de dados na nuvem** (PostgreSQL hospedado no Supabase). Este artigo demonstra onde e como os principais conceitos teóricos de sistemas distribuídos se manifestam nesse projeto.

---

## 2. Transparência

O conceito de **transparência** em sistemas distribuídos refere-se à capacidade de ocultar a complexidade da distribuição do usuário final. A ISO/IEC 10746 define oito formas de transparência. Três delas se destacam neste projeto:

### 2.1 Transparência de Acesso

O usuário que visualiza a tabela de produtos na interface não sabe — nem precisa saber — que os dados estão fisicamente armazenados em servidores do Supabase localizados em data centers nos EUA. A função JavaScript que popula a tabela é simplesmente:

```javascript
// app.js — loadProdutos()
const produtos = await apiGet('/produtos');
tbody.innerHTML = produtos.map(p => `<tr>...</tr>`).join('');
```

Do ponto de vista do código front-end, o acesso é idêntico a um banco local. A lógica de roteamento até o Supabase é completamente transparente.

### 2.2 Transparência de Localização

O front-end nunca hardcoda um endereço de banco de dados. Ele comunica apenas com a própria API (`/api/v1/...`). O back-end Spring Boot é quem conhece a URL de conexão com o Supabase, configurada via variável de ambiente:

```properties
# application.properties
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USER}
spring.datasource.password=${DATABASE_PASSWORD}
```

Assim, o banco pode ser migrado para outro provedor sem nenhuma mudança no front-end — transparência de localização em ação.

### 2.3 Transparência de Falha

Quando a API retorna um erro, o sistema captura a exceção e exibe uma mensagem amigável via `showToast()`, sem expor stack traces ou detalhes técnicos ao usuário. O mecanismo de **Spring Security** retorna respostas RFC 9457 (Problem Details), padronizando erros em JSON:

```json
{
  "title": "Saldo insuficiente",
  "detail": "O valor da compra (R$ 20.000) supera o saldo disponível (R$ 10.000).",
  "status": 422
}
```

---

## 3. Middleware

**Middleware** é a camada de software que fica entre o sistema operacional e as aplicações distribuídas, fornecendo serviços comuns como comunicação, autenticação, serialização e controle de acesso.

### 3.1 Spring Framework como Middleware

O Spring Boot atua como middleware completo neste projeto:

| Componente Spring | Papel de Middleware |
|---|---|
| `Spring Security` | Autenticação de sessão HTTP e controle de acesso por roles (RBAC) |
| `Spring Data JPA / Hibernate` | Abstrai o protocolo proprietário JDBC/PostgreSQL em objetos Java |
| `Spring MVC (DispatcherServlet)` | Roteia requisições HTTP para o Controller correto |
| `Jackson (ObjectMapper)` | Serializa objetos Java em JSON e desserializa JSON em objetos |

Exemplo: quando uma requisição chega ao endpoint `/api/v1/movimentacoes`, ela passa por **filtros de middleware** antes de chegar ao Controller:

```
HTTP Request → UsuarioSessaoRefreshFilter → AuthorizationFilter → MovimentacaoController
```

Esse pipeline de filtros é o middleware em ação — processando, validando e encaminhando mensagens.

### 3.2 HikariCP: Pool de Conexões como Middleware

O `HikariCP` gerencia um pool de conexões com o banco de dados Supabase. Ele reutiliza conexões TCP/IP já estabelecidas, evitando o overhead de abrir e fechar conexões a cada requisição. Esse é um padrão clássico de middleware para otimização de sistemas distribuídos.

---

## 4. Protocolos de Comunicação — HTTP

O protocolo **HTTP (HyperText Transfer Protocol)** é a espinha dorsal da comunicação neste projeto. Todo o tráfego entre front-end e back-end utiliza HTTP/1.1.

### 4.1 Verbos HTTP e Semântica REST

O projeto segue rigorosamente a semântica dos verbos HTTP para cada operação:

| Verbo HTTP | Endpoint Exemplo | Ação |
|---|---|---|
| `GET` | `/api/v1/produtos` | Listar todos os produtos |
| `POST` | `/api/v1/movimentacoes` | Criar nova movimentação financeira |
| `PUT` | `/api/v1/config` | Atualizar configurações de marca |
| `DELETE` | `/api/v1/produtos/{id}` | Remover um produto |

### 4.2 Códigos de Status HTTP

O back-end utiliza os códigos de status de forma semântica para comunicar o resultado das operações:

- `200 OK` — Leitura bem-sucedida
- `201 Created` — Recurso criado com sucesso
- `401 Unauthorized` — Sessão inválida ou expirada
- `403 Forbidden` — Usuário não tem permissão para a operação
- `422 Unprocessable Entity` — Regra de negócio violada (ex: saldo insuficiente)

### 4.3 Segurança via HTTPS e Cookies de Sessão

A autenticação utiliza o mecanismo de **Session Cookie** do Spring Security, onde o servidor emite um cookie `JSESSIONID` após o login bem-sucedido. O front-end armazena o role do usuário no `sessionStorage`, mas toda decisão de autorização definitiva é feita no back-end, seguindo o princípio de **Never Trust the Client**.

---

## 5. APIs e Web Services RESTful

### 5.1 Definição e Aplicação

Uma **API (Application Programming Interface)** define contratos de comunicação entre sistemas. Um **Web Service RESTful** é uma API acessível via HTTP que segue os princípios REST (Representational State Transfer) definidos por Roy Fielding (2000).

Neste projeto, a API RESTful é a interface que une o front-end JavaScript com o back-end Java. Ela é o componente central do sistema distribuído.

### 5.2 Documentação com OpenAPI (Swagger)

O projeto expõe sua documentação automática via Springdoc OpenAPI, acessível em `/swagger-ui.html`. Isso implementa o princípio de **auto-descrição** dos Web Services — a API descreve suas próprias capacidades sem dependência de documentação externa.

### 5.3 Padrão de Resposta Uniforme

Todos os endpoints seguem um padrão uniforme de resposta em JSON. Por exemplo, o endpoint de configuração de marca retorna:

```json
{
  "nomeAplicacao": "A3 Store",
  "logoBase64": null,
  "backgroundBase64": null,
  "btnTextDashboard": "Início",
  "btnTextNovaVenda": "Lançar Venda"
}
```

Esse padrão é fundamental em sistemas distribuídos pois garante que qualquer cliente (navegador, app mobile, sistema terceiro) consiga consumir a API sem conhecimento prévio do servidor.

---

## 6. Bancos de Dados Distribuídos e Serviços em Nuvem

### 6.1 Supabase como BaaS (Backend as a Service)

O projeto utiliza o **Supabase** como provedor de banco de dados na nuvem. O Supabase é uma plataforma que oferece PostgreSQL gerenciado com alta disponibilidade, replicação automática e backups — conceitos fundamentais de bancos de dados distribuídos.

Ao contrário de um banco de dados local, o banco na nuvem está geograficamente distribuído em múltiplos data centers, garantindo:

- **Alta Disponibilidade:** Réplicas automáticas evitam ponto único de falha
- **Escalabilidade:** Recursos computacionais podem ser ampliados sem migração manual
- **Durabilidade:** Backups automáticos e WAL (Write-Ahead Logging) protegem os dados

### 6.2 Connection Pooling em Ambiente Distribuído

A configuração `spring.datasource.hikari.*` define o pool de conexões TCP/IP com o servidor PostgreSQL remoto. Em um banco local, uma conexão é praticamente instantânea. Em um banco na nuvem, cada nova conexão envolve um handshake TCP + TLS, que pode levar dezenas de milissegundos. Por isso, o HikariCP mantém conexões persistentes e as reutiliza — um padrão crítico em sistemas distribuídos.

### 6.3 Modelo SaaS (Software as a Service)

O próprio projeto A3 Gestão Financeira pode ser classificado como um **SaaS**. Ele é executado em um servidor, acessado via navegador (sem instalação local) e o usuário paga apenas pelo uso dos recursos de infraestrutura. Esse é o modelo de entrega predominante em sistemas distribuídos modernos.

---

## 7. Controle de Consistência e Integridade de Dados

Em sistemas distribuídos, garantir a consistência dos dados é um desafio central, formalizado pelo **Teorema CAP** (Brewer, 2000): um sistema distribuído não pode garantir simultaneamente Consistência, Disponibilidade e Tolerância a Partição.

### 7.1 Transações Financeiras — Garantindo ACID

O projeto adota uma abordagem de consistência forte para as movimentações financeiras. Antes de registrar uma COMPRA, o `MovimentacaoFinanceiraService` calcula o saldo disponível com uma query agregada:

```java
// MovimentacaoFinanceiraService.java
BigDecimal totalReceitas = repository.calcularTotalPorTipo(TipoMovimentacao.VENDA);
BigDecimal totalDespesas = repository.calcularTotalPorTipo(TipoMovimentacao.COMPRA);
BigDecimal saldoAtual = totalReceitas.subtract(totalDespesas);

if (valor.compareTo(saldoAtual) > 0) {
    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
        "Saldo insuficiente. Saldo atual: " + saldoAtual);
}
```

Essa validação garante que o banco de dados nunca entre em um estado inconsistente (saldo negativo), implementando a propriedade **Consistency** do modelo ACID.

---

## 8. Segurança em Sistemas Distribuídos — RBAC

**RBAC (Role-Based Access Control)** é o modelo de controle de acesso onde permissões são atribuídas a papéis, e usuários herdam as permissões dos papéis que possuem.

Neste projeto, há três papéis:

| Role | Permissões |
|---|---|
| `USER` (Vendedor) | Visualizar produtos, registrar movimentações, ver seus relatórios |
| `ADMIN` (Catálogo) | Tudo do USER + gerenciar produtos, clientes, fornecedores e ver todos relatórios |
| `SUPERUSER` | Tudo do ADMIN + gerenciar contas, ver infraestrutura, personalizar a marca |

O RBAC é implementado em duas camadas — defesa em profundidade (Defense in Depth):

1. **Back-end:** Spring Security com `@PreAuthorize` e `requestMatchers(...).hasRole(...)`
2. **Front-end:** Ocultação de menus via JavaScript (`applyRoleAccessControl()`)

---

## 9. Quality Assurance (QA) em Sistemas Distribuídos

QA em sistemas distribuídos vai além de testes unitários. Inclui validações de contrato, limites de carga e comportamento sob falha.

### 9.1 Validações Implementadas no Projeto

| Camada | Validação | Propósito QA |
|---|---|---|
| Front-end | `oninput` na busca de tabela | Resposta imediata sem necessidade de Enter |
| Front-end | `maxlength` no CNPJ/CPF | Previne entrada de dados inválidos |
| Front-end | Verificação de tamanho de arquivo (2MB/3MB) | Previne sobrecarga no upload |
| Back-end | Regex `^\d{14}$` no CNPJ | Defense in Depth — valida mesmo se front-end for bypassado |
| Back-end | Verificação de saldo antes de COMPRA | Garante consistência financeira (ACID) |
| Back-end | Limite de tamanho em Base64 (2.8MB/4.2MB) | Previne sobrecarga no banco de dados |

---

## 10. Conclusão

Este projeto demonstra na prática como os conceitos teóricos de sistemas distribuídos emergem em uma aplicação web moderna:

- **Transparência** na abstração do banco de dados remoto e no tratamento de falhas
- **Middleware** via Spring Boot, Spring Security e HikariCP
- **Protocolo HTTP** com semântica REST completa para comunicação cliente-servidor
- **Web Services RESTful** como contrato de integração entre front-end e back-end
- **Banco de dados distribuído** (Supabase/PostgreSQL na nuvem) com garantias ACID
- **Serviços em nuvem** no modelo SaaS com escalabilidade horizontal
- **RBAC** como mecanismo de segurança em múltiplas camadas
- **QA** com validações em defesa em profundidade em todas as camadas

O projeto A3 Gestão Financeira não é apenas um CRUD: é uma demonstração aplicada dos fundamentos que sustentam a internet moderna e os sistemas empresariais distribuídos.

---

## Referências

- TANENBAUM, A. S.; VAN STEEN, M. **Sistemas Distribuídos: Princípios e Paradigmas**. 3ª ed. Pearson, 2017.
- FIELDING, R. T. **Architectural Styles and the Design of Network-based Software Architectures**. Doctoral dissertation, UC Irvine, 2000.
- BREWER, E. **Towards Robust Distributed Systems**. PODC Keynote, 2000.
- SPRING FRAMEWORK DOCUMENTATION. **Spring Security Reference**. Disponível em: https://docs.spring.io/spring-security/
- RFC 9457 — **Problem Details for HTTP APIs**. IETF, 2023.
- ISO/IEC 10746 — **Open Distributed Processing Reference Model**. ISO, 1998.
- SUPABASE DOCUMENTATION. **Architecture Overview**. Disponível em: https://supabase.com/docs
