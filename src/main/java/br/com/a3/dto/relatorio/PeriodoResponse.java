package br.com.a3.dto.relatorio;

import java.time.LocalDate;

public record PeriodoResponse(
        LocalDate inicio,
        LocalDate fim) {
}
