# Resumo de Modificacoes

Este arquivo resume as mudancas feitas no projeto ate aqui.

## O que foi feito

- Troca do login fake do frontend por autenticaçao real no backend.
- Criaçao de superusuario persistido no banco do Supabase.
- Criaçao de modelo de usuario do sistema com perfil e status ativo/inativo.
- Criaçao de endpoints para login, logout, sessao atual e gerenciamento de usuarios.
- Protecao de rotas por perfil:
  - `SUPERUSER` para gestao de usuarios
  - `ADMIN` e `SUPERUSER` para infraestrutura
  - `USER`, `ADMIN` e `SUPERUSER` para leitura de operacoes
- Ajuste do bootstrap de senha do superusuario para `gestaofinanceira2026`.
- Manutencao do banco principal em PostgreSQL/Supabase.
- Remocao do uso de H2 no runtime principal.
- Inclusao da visualizacao das tabelas do banco na area "Ferramentas do Desenvolvedor".
- Hierarquizacao das tabelas por:
  - modulo
  - schema
  - tabela/view
- Inclusao de descricao funcional para cada tabela visivel.
- Inclusao de dependencia por chave estrangeira quando detectada.
- Correçao do indicador de status da interface sem alterar `style.css`.
- Ajuste da inicializacao do frontend para respeitar a sessao autenticada.

## Arquivos principais alterados

- [src/main/java/br/com/a3/config/SecurityConfig.java](src/main/java/br/com/a3/config/SecurityConfig.java)
- [src/main/java/br/com/a3/config/SuperusuarioInitializer.java](src/main/java/br/com/a3/config/SuperusuarioInitializer.java)
- [src/main/java/br/com/a3/config/UsuarioSessaoRefreshFilter.java](src/main/java/br/com/a3/config/UsuarioSessaoRefreshFilter.java)
- [src/main/java/br/com/a3/controller/AuthController.java](src/main/java/br/com/a3/controller/AuthController.java)
- [src/main/java/br/com/a3/controller/UsuarioSistemaController.java](src/main/java/br/com/a3/controller/UsuarioSistemaController.java)
- [src/main/java/br/com/a3/controller/InfraestruturaController.java](src/main/java/br/com/a3/controller/InfraestruturaController.java)
- [src/main/java/br/com/a3/model/UsuarioSistema.java](src/main/java/br/com/a3/model/UsuarioSistema.java)
- [src/main/java/br/com/a3/model/PerfilUsuario.java](src/main/java/br/com/a3/model/PerfilUsuario.java)
- [src/main/java/br/com/a3/service/UsuarioSistemaService.java](src/main/java/br/com/a3/service/UsuarioSistemaService.java)
- [src/main/java/br/com/a3/repository/UsuarioSistemaRepository.java](src/main/java/br/com/a3/repository/UsuarioSistemaRepository.java)
- [src/main/resources/static/app.js](src/main/resources/static/app.js)
- [src/main/resources/static/index.html](src/main/resources/static/index.html)
- [src/main/resources/application.properties](src/main/resources/application.properties)
- [.env](.env)

## Estado atual

- App sobe com conexao ativa no Supabase.
- `health` responde com API e banco online.
- Superusuario atual:
  - usuario: `a3_admin_2026`
  - senha: `gestaofinanceira2026`

## Pendencias

- Tratar melhor o erro de login invalido para nao retornar `500`.
- Fechar os testes de integracao para o fluxo com sessao.
- Validar a tela de usuarios no navegador.
- Avaliar se a tabela legada `public.usuarios` deve ser mantida ou removida.
- Limpar logs locais do workspace se quiser deixar o repositorio mais limpo.

