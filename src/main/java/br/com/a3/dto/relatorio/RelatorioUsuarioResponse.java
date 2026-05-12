package br.com.a3.dto.relatorio;

import java.math.BigDecimal;

public record RelatorioUsuarioResponse(
        Long usuarioId,
        String nome,
        String username,
        String perfil,
        long quantidadeMovimentacoes,
        BigDecimal totalEntradas,
        BigDecimal totalSaidas,
        BigDecimal saldoPeriodo) {
}
