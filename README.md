# A3 Sistemas Distribuidos e Mobile

API REST para **gestao financeira e controle de produtos** desenvolvida com Spring Boot.

Esta versao do projeto ja entrega um sistema funcional com:

- **Autenticacao Real**: Login, logout e controle de sessao.
- **Persistencia em Nuvem**: Conectado ao PostgreSQL via Supabase.
- **Gestao de Usuarios**: Diferentes perfis (Superusuario, Admin, Funcionario).
- **CRUD Completo**: Produtos e movimentacoes financeiras.
- **Dashboard e Relatorios**: Resumo de saldo, estoque e relatorios detalhados por periodo.
- **Infraestrutura**: Area de monitoramento de banco de dados e logs SQL em tempo real.

## Tecnologias

- Java 25 (OpenJDK)
- Spring Boot 4.0.3
- Spring Security (Autenticacao e Autorizacao)
- Spring Data JPA (Hibernate)
- PostgreSQL (Supabase)
- Maven

## Arquitetura

O projeto segue uma arquitetura em camadas:

```text
controller -> service -> repository -> PostgreSQL (Supabase)
```

## Como executar

### Pre-requisitos

- Java 25 instalado
- JAVA_HOME configurado apontando para o Java 25
- Arquivo `.env` configurado com as credenciais do banco

### Subir a aplicacao

No Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

API disponivel em: `http://localhost:8080`

## Dados de Acesso Inicial (Superusuario)

- **Usuario:** `a3_admin_2026`
- **Senha:** `gestaofinanceira2026`

## Endpoints Principais

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Realiza login e inicia sessao |
| GET | `/api/v1/health` | Verifica status da API e Banco |
| GET | `/api/v1/produtos` | Lista produtos cadastrados |
| GET | `/api/v1/movimentacoes` | Lista movimentacoes financeiras |
| GET | `/api/v1/dashboard/resumo` | Resumo financeiro e de estoque |

## Licenca

Este projeto esta sob a licenca MIT. Consulte o arquivo [LICENSE](LICENSE).
