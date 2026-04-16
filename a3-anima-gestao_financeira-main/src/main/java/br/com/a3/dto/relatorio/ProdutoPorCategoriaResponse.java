package br.com.a3.dto.relatorio;

import java.math.BigDecimal;

public record ProdutoPorCategoriaResponse(
        String categoria,
        long quantidadeProdutos,
        long quantidadeItensEstoque,
        BigDecimal valorEstoqueCusto,
        BigDecimal valorEstoqueVenda) {
}
