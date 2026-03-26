package br.com.a3.dto.relatorio;

import java.math.BigDecimal;
import java.util.List;

public record RelatorioProdutosResponse(
        long totalProdutos,
        long totalProdutosAtivos,
        long totalProdutosInativos,
        long totalItensEmEstoque,
        BigDecimal valorTotalEstoqueCusto,
        BigDecimal valorTotalEstoqueVenda,
        BigDecimal margemBrutaEstoque,
        List<ProdutoPorCategoriaResponse> porCategoria) {
}
