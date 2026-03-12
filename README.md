# Desenvolvimento Spring Boot : A3 Sistemas Distribuídos e Mobile

> Tema do projeto: **Gestão financeira e controle de produtos**  
> Objetivo: **criar um software funcional** com as tecnologias abordadas (sobretudo Spring Boot), implementando características de um sistema distribuído e conectando teoria e prática.

Este documento descreve como desenvolvemos a API Spring Boot do projeto, quais decisões técnicas foram tomadas e como executar o sistema localmente.  
Onde houver `TODO`, complete com as decisões reais do grupo.

## 1) Escopo e responsabilidades
- **API principal (Spring Boot)**: expõe endpoints REST para gestão financeira e controle de produtos.
- **Cliente(s)**: front‑end web e/ou app mobile que consomem a API.
- **Serviços externos**: a definir em grupo (ex.: gateway de pagamento, email, mensageria, etc).

## 2) Stack e versões
- **Java**: 25.0.2 (OpenJDK, versão atual estável)
- **Spring Boot**: 4.0.3 (última versão estável, lançada em 19/02/2026)
- **Build**: Maven
- **Banco de dados**: a definir em grupo (PostgreSQL, MySQL, H2, etc.)
- **Migrações**: a definir em grupo (Flyway, Liquibase, none)
- **Testes**: a definir (JUnit, Mockito, Testcontainers, etc.)

## 3) Arquitetura (visão macro)
- **Padrão**: camadas clássicas (Controller → Service → Repository).
- **DTOs**: usados para entrada/saída no contrato HTTP.
- **Entidades**: representam o modelo persistido.
- **Distribuição**: clientes (web/mobile) acessam a API via HTTP/REST; a API persiste dados no banco; painel/admin centraliza o controle operacional.

> **Justificativa de sistema distribuído**  
> O sistema é distribuído porque há componentes executando em nós diferentes: clientes (web/mobile) em dispositivos distintos, API em servidor dedicado e banco de dados separado. A comunicação ocorre via HTTP/REST.

## 4) Organização do código
Estrutura sugerida (ajuste para o padrão do repositório):

```
src/main/java/br/com/a3/
  config/
  controller/
  dto/
  model/
  repository/
  service/
  exception/
```

## 5) Convenções de API
- **REST**: endpoints nomeados por recursos (`/produtos`, `/categorias`, `/movimentacoes`).
- **HTTP**: status 200/201/204/400/404/409/500 conforme o cenário.
- **Paginação**: a definir (ex.: `page`/`size`).
- **Versionamento**: `/api/v1`.

## 6) Modelos principais (exemplo)
> Substitua pelos modelos reais do projeto.

- **Produto**: id, nome, categoria, custo, preço, estoque, ativo.
- **Movimentação Financeira**: id, tipo (entrada/saída), valor, data, descrição, categoria.
- **Categoria**: id, nome, tipo (produto/financeiro).

## 7) Configuração e execução local

### 7.1 Pré‑requisitos
- Java instalado na versão definida.
- Banco de dados instalado (ou usar H2 em memória).
- `TODO` (Docker, se aplicável).

### 7.2 Variáveis de ambiente
Crie um arquivo `.env` (ou configure no `application.yml`):

```
DB_URL=jdbc:TODO
DB_USER=TODO
DB_PASS=TODO
```

### 7.3 Execução com Maven
```
./mvnw spring-boot:run
```

## 8) Configuração do banco
Estratégia de criação de tabelas e migrações: **a definir em grupo**.

Exemplo de `application.yml` (ajuste conforme o projeto):
```
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASS}
  jpa:
    hibernate:
      ddl-auto: update
```

## 9) Tratamento de erros
Padrão baseado em `@ControllerAdvice` com respostas JSON no formato **Problem Details (RFC 7807)**:
- Campos: `type`, `title`, `status`, `detail`, `instance`.
- Para erros de validação, incluir `errors[]` com `field` e `message`.

## 10) Testes
`TODO` Descrever como rodar os testes.

Exemplo:
```
./mvnw test
```

## 11) Observabilidade e logs
`TODO` (ex.: log em JSON, nível padrão, correlação de request).

## 12) Checklist para entrega
- [ ] Build e execução local funcionando.
- [ ] Endpoints principais documentados.
- [ ] Banco configurado e dados de exemplo.
- [ ] Testes básicos para regras de negócio.
- [ ] README atualizado.

## 13) Próximos passos do time
`TODO` Liste as tarefas abertas (ex.: autenticação, relatório financeiro, dashboard, etc.)

Este projeto é distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para detalhes.
