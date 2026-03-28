# Relatório de Entrega: A3 Gestão Financeira

Este documento detalha tudo o que foi construído neste projeto de **Gestão Financeira e Controle de Produtos**, organizando as tecnologias empregadas, as APIs desenvolvidas e as funcionalidades concluídas.

---

## 🛠️ Tecnologias e Ferramentas Utilizadas

O projeto foi construído utilizando as seguintes configurações e baterias de ferramentas (Stack Tecnológica):

| Camada | Tecnologia | Especificação / Uso |
|:---|:---|:---|
| **Linguagem Base** | Java 25 LTS | Linguagem oficial de desenvolvimento. |
| **Framework Backend** | Spring Boot | Núcleo do projeto, utilizando MVC e Data JPA. |
| **Persistência de Dados**| Banco em Memória H2 | Utilizado para rodar operações em tempo de execução. |
| **Tratamento de Erros** | Problem Details | Padrão Spring Boot Validation para exibir erros ao Frontend. |
| **Dependências** | Maven | Gerenciador de dependências com Wrapper (`mvnw`). |
| **Frontend Web** | HTML5, CSS3, JS Puro | Interface interativa construída do zero, sem uso de frameworks como React ou Angular. Foi integrada consumindo diretamente as APIs usando `fetch()`. |
| **Automação de Dados** | Database Seeding | Configurado `data.sql` para pré-inserção de produtos e relatórios assim que o H2 for "resetado" na inicialização. |

---

## 🔌 Tabela de APIs Rest (Endpoints Implementados)

A API do projeto cumpre com o preenchimento de **100% dos requisitos** propostos para um cenário de CRUD e relatórios de fluxo de caixa em uma loja:

| Módulo | Método | Rota Endpoint | Descrição da Funcionalidade | Finalizado? |
|:---:|:---:|:---|:---|:---:|
| **Produtos** | GET | `/api/v1/produtos` | Lista completa de produtos contidos no banco. | ✅ |
| **Produtos** | GET | `/api/v1/produtos/{id}` | Busca os detalhes de um produto específico. | ✅ |
| **Produtos** | POST | `/api/v1/produtos` | Insere (cadastra) um novo produto no banco. | ✅ |
| **Produtos** | PUT | `/api/v1/produtos/{id}` | Edita as informações de um determinado produto. | ✅ |
| **Produtos** | DELETE | `/api/v1/produtos/{id}` | Deleta fisicamente um produto do estoque. | ✅ |
| **Movimentações** | GET | `/api/v1/movimentacoes` | Traz o registro completo de tudo que entrou e saiu financeiramente. | ✅ |
| **Movimentações** | GET | `/api/v1/movimentacoes/{id}`| Localiza uma transação (entrada ou saída) financeira específica. | ✅ |
| **Movimentações** | POST | `/api/v1/movimentacoes` | Adiciona uma nova movimentação (ex: "Venda Mesa" - ENTRADA). | ✅ |
| **Movimentações** | PUT | `/api/v1/movimentacoes/{id}`| Altera as informações de uma transação errada. | ✅ |
| **Movimentações** | DELETE | `/api/v1/movimentacoes/{id}`| Apaga um fluxo financeiro do registro. | ✅ |
| **Dashboard** | GET | `/api/v1/dashboard/resumo` | Varre financeiro e produtos para entregar os totais (Entradas, Saídas, Saldo em Caixa), quantidade em estoque e total ativo. | ✅ |
| **Relatórios** | GET | `/api/v1/relatorios/financeiro` | Gera resultados filtrados combinando informações de datas (Ex: O que vendeu neste mês por Categoria). | ✅ |
| **Relatórios** | GET | `/api/v1/relatorios/produtos` | Gera a estimativa de Lucratividade, trazendo o *Valor de Custo* cruzado com a *Margem Bruta (Venda)*. | ✅ |

---

## 💡 Demais Informações Estruturais (O que mais foi feito?)

1. **Testes de Integração:** O código acompanha testes dentro da pasta `src/test/java`, validando relatórios e apis de forma local sob a automação do JUnit (`mvnw test`).
2. **Interface Visual Viva:** O portal de acesso principal da API (o site real no `/`) simula exatamente os dashboards e os formulários exigidos conforme o sistema de Backend. Você clica para preencher um produto na página da Web e os dados já caem no banco H2 automaticamente.
3. **Facilidade de Roteamento Local:** Existe um script prático (`start-local.cmd`) ensinando e formatando o processo para usuários testarem sem interagir obrigatoriamente pelas telas de debug pesado da IDE. (Veja `como_subir_o_servidor.md` para instruções).
4. **Monitoramento e Rastreador de Logs e Histórico (Nova Aba):** Uma nova interface foi desenvolvida garantindo total rastreabilidade. Nela, o sistema constrói dezenas de movimentações exibindo como uma verdadeira *Linha do Tempo (Timeline visual)*. Aliado a isto, uma aba especial nomeada **Console de Logs** realiza a captura de exceções e eventos globais do front-end (`window.onerror` e falhas nas chamadas `fetch`). O desenvolvedor ou administrador do sistema pode detectar problemas da Interface, sem nunca precisar abrir as "DevTools" do F12 de um navegador web. Os alertas gerados localmente e os erros compõem um painel de debugging amigável.

Tudo que foi solicitado inicialmente funciona perfeitamente interligado e de forma auto-suficiente na versão atual.
