# Desenvolvimento Spring Boot â€” A3 Sistemas DistribuÃ­dos e Mobile

> Tema do projeto: **GestÃ£o financeira e controle de produtos**  
> Objetivo: **criar um software funcional** com as tecnologias abordadas (sobretudo Spring Boot), implementando caracterÃ­sticas de um sistema distribuÃ­do e conectando teoria e prÃ¡tica.

Este documento descreve como desenvolvemos a API Spring Boot do projeto, quais decisÃµes tÃ©cnicas foram tomadas e como executar o sistema localmente.  
Onde houver `TODO`, complete com as decisÃµes reais do grupo.

## 1) Escopo e responsabilidades
- **API principal (Spring Boot)**: expÃµe endpoints REST para gestÃ£o financeira e controle de produtos.
- **Cliente(s)**: frontâ€‘end web e/ou app mobile que consomem a API.
- **ServiÃ§os externos**: a definir em grupo (ex.: gateway de pagamento, email, mensageria, etc).

## 2) Stack e versÃµes
- **Java**: 25.0.2 (OpenJDK, versÃ£o atual estÃ¡vel)
- **Spring Boot**: 4.0.3 (Ãºltima versÃ£o estÃ¡vel, lanÃ§ada em 19/02/2026)
- **Build**: Maven
- **Banco de dados**: a definir em grupo (PostgreSQL, MySQL, H2, etc.)
- **MigraÃ§Ãµes**: a definir em grupo (Flyway, Liquibase, none)
- **Testes**: a definir (JUnit, Mockito, Testcontainers, etc.)

## 3) Arquitetura (visÃ£o macro)
- **PadrÃ£o**: camadas clÃ¡ssicas (Controller â†’ Service â†’ Repository).
- **DTOs**: usados para entrada/saÃ­da no contrato HTTP.
- **Entidades**: representam o modelo persistido.
- **DistribuiÃ§Ã£o**: clientes (web/mobile) acessam a API via HTTP/REST; a API persiste dados no banco; painel/admin centraliza o controle operacional.

> **Justificativa de sistema distribuÃ­do**  
> O sistema Ã© distribuÃ­do porque hÃ¡ componentes executando em nÃ³s diferentes: clientes (web/mobile) em dispositivos distintos, API em servidor dedicado e banco de dados separado. A comunicaÃ§Ã£o ocorre via HTTP/REST.

## 4) OrganizaÃ§Ã£o do cÃ³digo
Estrutura sugerida (ajuste para o padrÃ£o do repositÃ³rio):

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

## 5) ConvenÃ§Ãµes de API
- **REST**: endpoints nomeados por recursos (`/produtos`, `/categorias`, `/movimentacoes`).
- **HTTP**: status 200/201/204/400/404/409/500 conforme o cenÃ¡rio.
- **PaginaÃ§Ã£o**: a definir (ex.: `page`/`size`).
- **Versionamento**: `/api/v1`.

## 6) Modelos principais (exemplo)
> Substitua pelos modelos reais do projeto.

- **Produto**: id, nome, categoria, custo, preÃ§o, estoque, ativo.
- **MovimentaÃ§Ã£o Financeira**: id, tipo (entrada/saÃ­da), valor, data, descriÃ§Ã£o, categoria.
- **Categoria**: id, nome, tipo (produto/financeiro).

## 7) ConfiguraÃ§Ã£o e execuÃ§Ã£o local

### 7.1 PrÃ©â€‘requisitos
- Java instalado na versÃ£o definida.
- Banco de dados instalado (ou usar H2 em memÃ³ria).
- `TODO` (Docker, se aplicÃ¡vel).

### 7.2 VariÃ¡veis de ambiente
Crie um arquivo `.env` (ou configure no `application.yml`):

```
DB_URL=jdbc:TODO
DB_USER=TODO
DB_PASS=TODO
```

### 7.3 ExecuÃ§Ã£o com Maven
```
./mvnw spring-boot:run
```

## 8) ConfiguraÃ§Ã£o do banco
EstratÃ©gia de criaÃ§Ã£o de tabelas e migraÃ§Ãµes: **a definir em grupo**.

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
PadrÃ£o baseado em `@ControllerAdvice` com respostas JSON no formato **Problem Details (RFC 7807)**:
- Campos: `type`, `title`, `status`, `detail`, `instance`.
- Para erros de validaÃ§Ã£o, incluir `errors[]` com `field` e `message`.

## 10) Testes
`TODO` Descrever como rodar os testes.

Exemplo:
```
./mvnw test
```

## 11) Observabilidade e logs
`TODO` (ex.: log em JSON, nÃ­vel padrÃ£o, correlaÃ§Ã£o de request).

## 12) Checklist para entrega
- [ ] Build e execuÃ§Ã£o local funcionando.
- [ ] Endpoints principais documentados.
- [ ] Banco configurado e dados de exemplo.
- [ ] Testes bÃ¡sicos para regras de negÃ³cio.
- [ ] README atualizado.

## 13) PrÃ³ximos passos do time
`TODO` Liste as tarefas abertas (ex.: autenticaÃ§Ã£o, relatÃ³rio financeiro, dashboard, etc.)


## MIT License
<details>
<summary>Ver conteúdo da licença MIT</summary>

```
MIT License

Copyright (c) 2026 Guilherme Ledo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>
