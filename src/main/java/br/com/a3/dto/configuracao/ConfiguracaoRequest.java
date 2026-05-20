package br.com.a3.dto.configuracao;

public record ConfiguracaoRequest(
    String nomeAplicacao,
    String logoBase64,
    String backgroundBase64,
    String btnTextDashboard,
    String btnTextNovaVenda,
    String btnTextNovoProduto,
    String btnTextProdutos,
    String btnTextClientes,
    String btnTextMovimentacoes,
    String btnTextUsuarios,
    String btnTextHistorico
) {}
