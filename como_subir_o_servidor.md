# 🚀 Como Subir o Servidor — A3 Gestão Financeira

> Projeto: `a3-anima-gestao_financeira` | Stack: Spring Boot 3 + PostgreSQL (Supabase)

---

## 📋 Pré-requisitos

Antes de subir o servidor, verifique que você tem instalado:

- **Java 17+** → confirme com: `java -version`
- **Maven Wrapper** → já incluso no projeto (`mvnw.cmd`)
- **Arquivo `.env`** → deve existir na raiz do projeto com as variáveis do banco:
  ```
  DB_PASSWORD=sua_senha_aqui
  ADMIN_PASSWORD=senha_admin_aqui
  ```

---

## ▶️ Subindo o Servidor (do zero)

Abra o **PowerShell** e execute os comandos abaixo:

```powershell
# 1. Entre na pasta do projeto
cd "C:\Users\Wellinton_Voss\OneDrive\Área de Trabalho\A3\a3-anima-gestao_financeira"

# 2. Suba o servidor
.\mvnw.cmd spring-boot:run
```

Aguarde a mensagem de sucesso:
```
Started A3AnimaGestaoFinanceiraApplication in X.XXX seconds
Tomcat started on port 8080
```

✅ Servidor disponível em: **http://localhost:8080**

---

## 🔄 Reiniciando o Servidor (Matar + Subir)

Use este processo sempre que fizer alterações no código Java:

### Passo 1 — Matar o processo atual
```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Passo 2 — Subir novamente
```powershell
cd "C:\Users\Wellinton_Voss\OneDrive\Área de Trabalho\A3\a3-anima-gestao_financeira"
.\mvnw.cmd spring-boot:run
```

### Tudo em um único comando (atalho rápido)
```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep 2; .\mvnw.cmd spring-boot:run
```

> ⚠️ Alterações em arquivos `.java` **exigem** reinício do servidor.  
> Alterações em `app.js`, `index.html` ou `.css` **não exigem** reinício — basta `Ctrl+F5` no navegador.

---

## ⏹️ Parando o Servidor

### Opção A — No terminal onde o servidor está rodando
```
Ctrl + C
```

### Opção B — Via PowerShell (qualquer janela)
```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 🐛 Erros Comuns na Inicialização

### ❌ `COMPILATION ERROR`
O código Java tem um erro de sintaxe. Leia o `[ERROR]` no log, corrija o arquivo indicado e tente novamente.

### ❌ `column "X" contains null values`
O Hibernate tentou adicionar uma coluna `NOT NULL` a uma tabela que já tem dados. Solução: altere a entidade para permitir `nullable = true` temporariamente, ou adicione o valor padrão no banco via Supabase.

### ❌ `package tools.jackson.databind does not exist`
Import errado. Substitua `tools.jackson.databind` por `com.fasterxml.jackson.databind`.

### ❌ `Port 8080 already in use`
Já existe um servidor rodando. Mate o processo Java antes de subir novamente:
```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
```

### ❌ `Connection refused` / `Could not connect to database`
O arquivo `.env` está ausente ou com a senha errada. Verifique se ele existe na raiz do projeto.

---

## 🔍 Verificando se o Servidor Está Rodando

```powershell
# Verifica se há processo Java ativo
Get-Process -Name java -ErrorAction SilentlyContinue

# Testa o endpoint de saúde
Invoke-WebRequest http://localhost:8080/api/v1/health -UseBasicParsing
```

---

## 🗄️ Banco de Dados

- Provedor: **PostgreSQL via Supabase** (nuvem)
- Dados são **persistentes** — reiniciar o servidor **não apaga** os dados
- Para gerenciar o banco diretamente: acesse o **dashboard do Supabase**
- A senha do banco vem do arquivo `.env` (nunca commitar este arquivo no Git)

---

## 🧪 Rodando os Testes

```powershell
.\mvnw.cmd test
```

---

## 📁 Estrutura de Pastas Relevante

```
a3-anima-gestao_financeira/
├── src/main/java/          → Código Java (backend)
├── src/main/resources/
│   ├── static/             → Frontend (app.js, index.html, style.css)
│   └── application.properties → Configurações do Spring
├── .env                    → Variáveis de ambiente (NÃO commitar)
├── mvnw.cmd                → Maven Wrapper (use sempre este)
└── pom.xml                 → Dependências do projeto
```
