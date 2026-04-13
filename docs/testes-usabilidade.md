**SISTEMA DE CONTROLE DE VENDAS BASEADO EM ARQUITETURA DISTRIBUÍDA**  


**Resumo**

Este artigo apresenta o desenvolvimento de um sistema de controle de vendas baseado em arquitetura distribuída, com o objetivo de superar limitações de sistemas centralizados. A metodologia envolveu a utilização de tecnologias como Spring Boot e APIs REST, além da realização de testes funcionais e de usabilidade. Os resultados demonstram melhoria na organização do sistema, facilidade de manutenção e eficiência na comunicação entre componentes.

Palavras-chave: Sistemas distribuídos, API REST, HTTP, Spring Boot.

**Abstract**

This article presents the development of a sales management system based on distributed architecture. The methodology involved modern technologies such as Spring Boot and REST APIs. Results show improved maintainability and performance.

Keywords: Distributed systems, REST API, Spring Boot.

**1. Introdução**

Com o avanço das aplicações modernas, sistemas centralizados tornam-se limitados diante da necessidade de escalabilidade e disponibilidade. Nesse contexto, sistemas distribuídos surgem como solução eficiente. Este trabalho tem como objetivo desenvolver um sistema de controle de vendas utilizando arquitetura distribuída.

**2. Desenvolvimento**

O sistema foi desenvolvido utilizando as seguintes especificações técnicas:  
  
Ambiente: Ubuntu 24.04.4 LTS.  
  
Linguagem e Framework: Java 25.0.2, Spring Boot 4.0.3 e Spring Framework 7.0.5.  
  
Servidor: Apache Tomcat 11.0.18.  
  
Persistência: Spring Data JPA e Hibernate ORM 7.2.4.Final.  
  
Banco de Dados: H2 Database 2.4.240.  
  
Frontend: HTML, CSS e JavaScript.  


**2.1. Aplicação de Conceitos de Sistemas Distribuídos**

Transparência: Observada na interação do usuário, que não percebe a distribuição dos componentes.  
  
Middleware: Representado pelo Spring Boot, responsável por intermediar a comunicação entre frontend e backend.  
  
Protocolo: Uso de HTTP para comunicação entre cliente e servidor via requisições REST.  
  
Operações: APIs REST permitem cadastro e consulta de dados utilizando métodos como GET e POST.  
  
Ambiente: O banco de dados local simula um ambiente distribuído, sendo a arquitetura compatível com computação em nuvem.  


**3. Relatório de Testes de Usabilidade**

Data do teste: 05 de Abril de 2026

**3.1. Introdução**

Este documento apresenta os resultados dos Testes de Usabilidade realizados no sistema. O objetivo desta análise é testar a interface e mapear oportunidades de melhoria que impactam a experiência do usuário (UX), a integridade dos dados e a percepção de qualidade do software.

**3.2. Metodologia**

A análise foi baseada na navegação pelo sistema verificando os seguintes pontos:  
  
Prevenção de Erros.  
  
Visibilidade do Status do Sistema.  
  
Consistência e Padronização.  
  
Compatibilidade do sistema com o mundo real (linguagem do usuário).  


3.3. Resultados dos Testes


Linguagem Adequada: Os termos utilizados (Movimentações, Estoque, Parcelas, Vencimento) conversam diretamente com o modelo mental dos usuários.


Consistência Visual: A padronização das tabelas (Produtos e Movimentações) com colunas e ações bem definidas facilita o uso.


Filtros em Relatórios: A exigência de Data Início e Data Fim antes de gerar relatórios é uma excelente prática de performance e usabilidade.


Integridade de Dados no Campo "Categoria": Atualmente, a categoria é inserida via campo de texto livre. Isso permite variações de digitação (ex: "Venda", "venda", "Vendas", "VENDA"), o que quebra a consolidação de dados nos relatórios, gerando linhas duplicadas para o mesmo conceito


Ausência de Acentuação Ortográfica: Textos da interface como "Gestao", "Movimentacoes", "Relatorios" e "Historico" estão sem acentuação gráfica.


Controle de Visibilidade de Perfis: Abas técnicas como Infraestrutura e Histórico & Logs deveriam ser visualizadas apenas por usuários com perfis de administrador.


Gerar Relatório Financeiro na Tela: Para um banco de dados pequeno, mostrar todos os itens de uma vez funciona. Porém, conforme as movimentações financeiras crescerem, a página ficará lenta e longa. Nesse caso é necessário controles de paginação, campos de busca rápida através de filtros e também a opção de exportar os dados.


Filtros de Data na Aba Relatórios: Atualmente é possível inserir uma data de início maior que a data final. Para evitar consultas inválidas e melhorar a experiência, sugerimos incluir uma validação no calendário ou um aviso simples caso as datas sejam incompatíveis.


Sincronização de Dados (Movimentações e Relatórios): A persistência de novos registros de movimentação está sendo refletida corretamente nas views de relatórios. Não foram detectadas exceções (erros ou timeouts) durante a atualização do estado da aplicação, garantindo a integridade transacional e a consistência em tempo real dos dados consultados


**4. Resultados e Discussão**

Os resultados demonstraram melhoria na organização do código, maior modularidade e facilidade de manutenção. Observou-se eficiência na comunicação entre componentes e redução da complexidade. A utilização da arquitetura distribuída e a separação entre frontend e backend mostraram-se adequadas para escalabilidade.

**5. Conclusão**

Conclui-se que a aplicação dos conceitos de sistemas distribuídos foi essencial para o sucesso do projeto, resultando em um sistema eficiente e modular. Como trabalhos futuros, sugere-se a implementação em nuvem e a aplicação das melhorias de interface identificadas nos testes.

**6. Referências**

TANENBAUM, A. S.; STEEN, M. Distributed Systems.  
SPRING. Spring Boot Documentation.
