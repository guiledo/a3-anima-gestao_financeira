package br.com.a3.dto.relatorio;

import java.math.BigDecimal;
import java.util.List;

public record RelatorioFinanceiroResponse(
        PeriodoResponse periodo,
        BigDecimal totalEntradas,
        BigDecimal totalSaidas,
        BigDecimal saldoPeriodo,
        long quantidadeMovimentacoes,
        BigDecimal mediaDiariaEntradas,
        BigDecimal mediaDiariaSaidas,
        List<MovimentacaoPorCategoriaResponse> entradasPorCategoria,
        List<MovimentacaoPorCategoriaResponse> saidasPorCategoria) {
}
