package br.com.a3.dto.relatorio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record FechamentoClienteResponse(
        String cliente,
        BigDecimal valorTotalMovimentado,
        BigDecimal valorDevidoNoPeriodo,
        long quantidadeMovimentacoes,
        LocalDate proximoVencimento,
        List<DebitoMensalClienteResponse> debitosMensais,
        List<FechamentoClienteMovimentacaoResponse> movimentacoes) {
}
