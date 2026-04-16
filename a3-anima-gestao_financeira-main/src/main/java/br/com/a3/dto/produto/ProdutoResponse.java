package br.com.a3.dto.produto;

import java.math.BigDecimal;

public record ProdutoResponse(
        Long id,
        String nome,
        String categoria,
        BigDecimal custo,
        BigDecimal preco,
        Integer estoque,
        Boolean ativo) {
}
