# A3 Sistemas Distribuidos e Mobile

API REST para **gestao financeira e controle de produtos** desenvolvida com Spring Boot.

Esta versao do projeto ja entrega um MVP funcional com:

- CRUD de produtos
- CRUD de movimentacoes financeiras
- resumo de dashboard com saldo e estoque
- validacao de entrada com respostas em Problem Details
- persistencia em banco H2 em memoria
- testes de integracao cobrindo os fluxos principais

## Tecnologias

- Java 21
- Spring Boot 4.0.3
- Spring Web MVC
- Spring Data JPA
- Spring Validation
- H2 Database
- Maven
- JUnit 5

## Arquitetura

O projeto segue uma arquitetura em camadas:

```text
controller -> service -> repository -> banco H2
```

Organizacao principal do codigo:

```text
src/main/java/br/com/a3/
  controller/
  dto/
  exception/
  model/
  repository/
  service/
```

## Como executar

### Pre-requisitos

- Java 21 instalado
- Maven Wrapper do proprio projeto

### Subir a aplicacao

No Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

No Linux/macOS:

```bash
./mvnw spring-boot:run
```

API disponivel em:

```text
http://localhost:8080
```

Console do H2:

```text
http://localhost:8080/h2-console
```

Use os seguintes dados no console:

```text
JDBC URL: jdbc:h2:mem:a3db
User Name: sa
Password:
```

## Endpoints

### Produtos

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| GET | `/api/v1/produtos` | Lista todos os produtos |
| GET | `/api/v1/produtos/{id}` | Busca um produto por id |
| POST | `/api/v1/produtos` | Cria um produto |
| PUT | `/api/v1/produtos/{id}` | Atualiza um produto |
| DELETE | `/api/v1/produtos/{id}` | Remove um produto |

Exemplo de payload:

```json
{
  "nome": "Notebook Dell",
  "categoria": "Informatica",
  "custo": 3200.00,
  "preco": 4500.00,
  "estoque": 8,
  "ativo": true
}
```

### Movimentacoes financeiras

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| GET | `/api/v1/movimentacoes` | Lista as movimentacoes |
| GET | `/api/v1/movimentacoes/{id}` | Busca uma movimentacao por id |
| POST | `/api/v1/movimentacoes` | Cria uma movimentacao |
| PUT | `/api/v1/movimentacoes/{id}` | Atualiza uma movimentacao |
| DELETE | `/api/v1/movimentacoes/{id}` | Remove uma movimentacao |

Exemplo de payload:

```json
{
  "tipo": "ENTRADA",
  "valor": 1500.00,
  "data": "2026-03-25",
  "descricao": "Venda do dia",
  "categoria": "Vendas"
}
```

### Dashboard

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| GET | `/api/v1/dashboard/resumo` | Retorna saldo financeiro e estoque |

Resposta esperada:

```json
{
  "totalEntradas": 1000.00,
  "totalSaidas": 250.00,
  "saldoAtual": 750.00,
  "totalProdutosAtivos": 1,
  "totalItensEmEstoque": 10,
  "valorTotalEstoque": 1200.00,
  "totalMovimentacoes": 2
}
```

### Relatórios

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| GET | `/api/v1/relatorios/financeiro?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` | Relatorio financeiro por periodo |
| GET | `/api/v1/relatorios/produtos` | Relatorio consolidado de produtos por categoria |

Exemplo de requisicao do relatorio financeiro:

```text
GET /api/v1/relatorios/financeiro?dataInicio=2026-03-01&dataFim=2026-03-31
```

Resposta esperada:

```json
{
  "periodo": {
    "inicio": "2026-03-01",
    "fim": "2026-03-31"
  },
  "totalEntradas": 15000.00,
  "totalSaidas": 8500.00,
  "saldoPeriodo": 6500.00,
  "quantidadeMovimentacoes": 12,
  "mediaDiariaEntradas": 483.87,
  "mediaDiariaSaidas": 274.19,
  "entradasPorCategoria": [
    {
      "categoria": "Vendas",
      "quantidade": 8,
      "valorTotal": 12000.00
    },
    {
      "categoria": "Servicos",
      "quantidade": 4,
      "valorTotal": 3000.00
    }
  ],
  "saidasPorCategoria": [
    {
      "categoria": "Fornecedores",
      "quantidade": 5,
      "valorTotal": 5000.00
    },
    {
      "categoria": "Operacional",
      "quantidade": 3,
      "valorTotal": 3500.00
    }
  ]
}
```

Exemplo de resposta do relatorio de produtos:

```json
{
  "totalProdutos": 10,
  "totalProdutosAtivos": 8,
  "totalProdutosInativos": 2,
  "totalItensEmEstoque": 150,
  "valorTotalEstoqueCusto": 25000.00,
  "valorTotalEstoqueVenda": 38000.00,
  "margemBrutaEstoque": 13000.00,
  "porCategoria": [
    {
      "categoria": "Informatica",
      "quantidadeProdutos": 5,
      "quantidadeItensEstoque": 80,
      "valorEstoqueCusto": 18000.00,
      "valorEstoqueVenda": 28000.00
    },
    {
      "categoria": "Perifericos",
      "quantidadeProdutos": 3,
      "quantidadeItensEstoque": 70,
      "valorEstoqueCusto": 7000.00,
      "valorEstoqueVenda": 10000.00
    }
  ]
}
```

Os parametros `dataInicio` e `dataFim` sao obrigatorios no relatorio financeiro e devem estar no formato ISO 8601 (YYYY-MM-DD).

## Tratamento de erros

A API responde erros no formato **Problem Details**.

Exemplo para validacao:

```json
{
  "type": "https://a3.local/problems/validacao",
  "title": "Falha de validacao",
  "status": 400,
  "detail": "Um ou mais campos sao invalidos.",
  "instance": "/api/v1/produtos",
  "errors": [
    {
      "field": "nome",
      "message": "nome e obrigatorio"
    }
  ]
}
```

## Testes

Para rodar os testes:

No Windows:

```powershell
.\mvnw.cmd test
```

No Linux/macOS:

```bash
./mvnw test
```

## Proximos passos sugeridos

- adicionar autenticacao e autorizacao
- criar cadastro de categorias separado
- integrar com banco persistente, como PostgreSQL
- documentar a API com OpenAPI/Swagger

## Licenca

Este projeto esta sob a licenca MIT. Consulte o arquivo [LICENSE](LICENSE).
