package br.com.a3.dto.relatorio;

import java.math.BigDecimal;

public record MovimentacaoPorCategoriaResponse(
        String categoria,
        long quantidade,
        BigDecimal valorTotal) {
}
