package br.com.a3.dto.relatorio;

import java.math.BigDecimal;

public record DebitoMensalClienteResponse(
        String competencia,
        BigDecimal valorDevido) {
}
