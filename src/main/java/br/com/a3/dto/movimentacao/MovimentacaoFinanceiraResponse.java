package br.com.a3.dto.movimentacao;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.a3.model.TipoMovimentacao;

public record MovimentacaoFinanceiraResponse(
        Long id,
        TipoMovimentacao tipo,
        BigDecimal valor,
        LocalDate data,
        String descricao,
        String categoria) {
}
