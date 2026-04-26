# Ajustes de seguranca e prototipo

## Objetivo

Manter o design atual do aplicativo e corrigir a camada de seguranca para usar a autenticacao real do backend com os usuarios persistidos no Supabase.

## O que foi ajustado

- O login do frontend passou a usar `POST /api/v1/auth/login`.
- A sessao atual passou a ser validada com `GET /api/v1/auth/me`.
- O logout passou a chamar `POST /api/v1/auth/logout`.
- As chamadas `fetch` agora usam credenciais de mesma origem para enviar o cookie de sessao do Spring.
- A tela de usuarios deixou de depender de usuarios locais do navegador e passou a usar `/api/v1/usuarios`.
- O superusuario consegue criar usuarios com perfil `USER`, `ADMIN` ou `SUPERUSER`.
- O superusuario consegue alterar perfil, status ativo/inativo e senha de usuarios existentes.
- `USER` agora representa um vendedor: visualiza dados permitidos e cria/edita/exclui as proprias movimentacoes.
- `ADMIN` pode gerenciar produtos e movimentacoes, alem de acessar historico e infraestrutura.
- `SUPERUSER` pode gerenciar usuarios e tambem tem acesso administrativo.
- Cada movimentacao criada passa a registrar `vendedorUsername` e `vendedorNome`.
- Vendedores nao conseguem alterar movimentacoes de outros vendedores; essa tentativa retorna `403`.
- A area de infraestrutura ganhou um mapa simples das tabelas do Supabase, agrupado por area de negocio e atualizado dinamicamente a partir do `information_schema`.
- Senha padrao sensivel foi removida do `application.properties`; agora deve vir de `SUPERUSER_PASSWORD` ou `ADMIN_PASSWORD`.

## Permissoes esperadas

| Perfil | Acesso |
| --- | --- |
| `USER` | Vendedor: cria e gerencia as proprias movimentacoes; produtos seguem como catalogo administrado |
| `ADMIN` | Leitura e escrita em produtos/movimentacoes, historico e infraestrutura |
| `SUPERUSER` | Tudo que o admin faz, mais criacao e permissionamento de usuarios |

## Como testar manualmente

1. Subir a aplicacao localmente.
2. Entrar com o superusuario configurado no `.env`.
3. Acessar a tela `Usuarios`.
4. Criar um usuario `USER` e confirmar que ele consegue criar uma movimentacao propria.
5. Confirmar que o `USER` nao consegue editar produtos nem acessar a tela de usuarios.
6. Criar um usuario `ADMIN` e confirmar que ele consegue criar/editar/excluir produtos e movimentacoes, mas nao acessa a tela de usuarios.
7. Abrir `Ferramentas do Desenvolvedor` e validar o `Mapa simples das tabelas do Supabase`.
8. Alterar um usuario existente para outro perfil e validar o comportamento ao fazer novo login.

## Comando para subir localmente

```powershell
.\mvnw.cmd spring-boot:run
```

Se o Maven Wrapper tentar baixar dependencias e houver bloqueio de rede, use a instalacao Maven ja baixada:

```powershell
$env:MAVEN_OPTS="-Dmaven.repo.local=C:\Users\Wellinton_Voss\.codex\memories\m2repo"
& "C:\Users\Wellinton_Voss\.m2\wrapper\dists\apache-maven-3.9.14\ed7edd442f634ac1c1ef5ba2b61b6d690b5221091f1a8e1123f5fadcc967520d\bin\mvn.cmd" spring-boot:run
```

## Observacao sobre os testes neste ambiente

Foi feita a atualizacao dos testes de integracao para autenticar antes de chamar endpoints protegidos. Neste sandbox, o Maven conseguiu resolver dependencias usando um repositorio local alternativo, mas a execucao foi bloqueada ao tentar escrever arquivos gerados em `target/classes`.
