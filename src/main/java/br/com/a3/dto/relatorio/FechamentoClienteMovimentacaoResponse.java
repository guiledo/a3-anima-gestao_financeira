package br.com.a3.dto.relatorio;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.a3.model.TipoPagamento;

public record FechamentoClienteMovimentacaoResponse(
        Long id,
        String descricao,
        String categoria,
        BigDecimal valor,
        LocalDate data,
        TipoPagamento tipoPagamento,
        Integer quantidadeParcelas,
        LocalDate dataPrimeiroVencimento) {
}
