# Como Subir o Servidor

Este guia explica como executar o projeto **A3 Gestão Financeira** localmente.

---

## Pré-requisitos

Antes de tudo, certifique-se de ter instalado:

- **Java 25** (JDK 25) — obrigatório, a versão 21 ou inferior causará erro de compilação.
- **JAVA_HOME** configurado apontando para o Java 25 nas variáveis de ambiente do Windows.

### Verificar se o Java 25 está ativo

Abra um terminal (PowerShell ou CMD) e rode:

```powershell
java -version
```

A saída deve mostrar algo como:

```
openjdk version "25.0.x" ...
```

Se ainda aparecer a versão 21 ou outra, reinicie o terminal (ou o VS Code) após a instalação do Java 25.

---

## Subindo o servidor (Windows)

### Opção 1 — Usando o script pronto

Na raiz do projeto existe o arquivo `start-local.cmd`. Basta executá-lo:

```cmd
.\start-local.cmd
```

> Este script limpa os logs anteriores e inicia o Spring Boot automaticamente.
> Os logs de saída ficam gravados nos arquivos `app.log` e `app.err.log`.

### Opção 2 — Usando o Maven Wrapper diretamente

```powershell
.\mvnw.cmd spring-boot:run
```

---

## Verificando se o servidor subiu

Após iniciar, aguarde a mensagem no terminal:

```
Started A3AnimaGestaoFinanceiraApplication in X.XX seconds
```

A aplicação ficará disponível nos endereços abaixo:

| Recurso | URL |
|---|---|
| **Interface Web (Frontend)** | http://localhost:8080 |
| **Console do banco H2** | http://localhost:8080/h2-console |
| **API REST** | http://localhost:8080/api/v1 |

### Dados de acesso ao H2 Console

| Campo | Valor |
|---|---|
| JDBC URL | `jdbc:h2:mem:a3db` |
| User Name | `sa` |
| Password | *(vazio)* |

---

## Parando o servidor

No terminal onde o servidor está rodando, pressione:

```
Ctrl + C
```

---

## Rodando os testes

Para executar os testes de integração:

```powershell
.\mvnw.cmd test
```

---

## Observação importante

O banco de dados utilizado é o **H2 em memória**. Isso significa que:

- Os dados são **perdidos** toda vez que o servidor é reiniciado.
- Isso é intencional para o ambiente de desenvolvimento/testes desta fase do projeto.
- Para persistência real, consulte os objetivos futuros no arquivo `requisitos_contemplados_e_objetivos.md`.
