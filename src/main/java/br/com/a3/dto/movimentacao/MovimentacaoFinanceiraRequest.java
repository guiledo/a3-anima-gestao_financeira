package br.com.a3.dto.movimentacao;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.a3.model.TipoPagamento;
import br.com.a3.model.TipoMovimentacao;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

public record MovimentacaoFinanceiraRequest(
        @NotNull(message = "tipo e obrigatorio")
        TipoMovimentacao tipo,

        @NotNull(message = "valor e obrigatorio")
        @DecimalMin(value = "0.01", message = "valor deve ser maior que zero")
        @Digits(integer = 13, fraction = 2, message = "valor deve ter no maximo 13 inteiros e 2 casas decimais")
        BigDecimal valor,

        @NotNull(message = "data e obrigatoria")
        @PastOrPresent(message = "data nao pode estar no futuro")
        LocalDate data,

        @NotBlank(message = "descricao e obrigatoria")
        @Size(max = 160, message = "descricao deve ter no maximo 160 caracteres")
        String descricao,

        @NotBlank(message = "cliente e obrigatorio")
        @Size(max = 120, message = "cliente deve ter no maximo 120 caracteres")
        String cliente,

        @NotBlank(message = "categoria e obrigatoria")
        @Size(max = 80, message = "categoria deve ter no maximo 80 caracteres")
        String categoria,

        @NotNull(message = "tipoPagamento e obrigatorio")
        TipoPagamento tipoPagamento,

        @NotNull(message = "quantidadeParcelas e obrigatoria")
        @Min(value = 1, message = "quantidadeParcelas deve ser de pelo menos 1")
        @Max(value = 360, message = "quantidadeParcelas deve ser de no maximo 360")
        Integer quantidadeParcelas,

        @NotNull(message = "dataPrimeiroVencimento e obrigatoria")
        LocalDate dataPrimeiroVencimento) {
}
