package br.com.a3.dto.dashboard;

import java.math.BigDecimal;

public record ResumoDashboardResponse(
        BigDecimal totalEntradas,
        BigDecimal totalSaidas,
        BigDecimal saldoAtual,
        long totalProdutosAtivos,
        long totalItensEmEstoque,
        BigDecimal valorTotalEstoque,
        long totalMovimentacoes) {
}
