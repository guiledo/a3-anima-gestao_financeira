package br.com.a3.dto.relatorio;

import java.math.BigDecimal;

public record RelatorioFornecedorResponse(
        Long fornecedorId,
        String nome,
        long quantidadeMovimentacoes,
        BigDecimal totalSaidas) {
}
