package br.com.a3.dto.produto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProdutoRequest(
        @NotBlank(message = "nome e obrigatorio")
        @Size(max = 120, message = "nome deve ter no maximo 120 caracteres")
        String nome,

        @NotBlank(message = "categoria e obrigatoria")
        @Size(max = 80, message = "categoria deve ter no maximo 80 caracteres")
        String categoria,

        @NotNull(message = "custo e obrigatorio")
        @DecimalMin(value = "0.0", message = "custo nao pode ser negativo")
        @Digits(integer = 13, fraction = 2, message = "custo deve ter no maximo 13 inteiros e 2 casas decimais")
        BigDecimal custo,

        @NotNull(message = "preco e obrigatorio")
        @DecimalMin(value = "0.0", message = "preco nao pode ser negativo")
        @Digits(integer = 13, fraction = 2, message = "preco deve ter no maximo 13 inteiros e 2 casas decimais")
        BigDecimal preco,

        @NotNull(message = "estoque e obrigatorio")
        @Min(value = 0, message = "estoque nao pode ser negativo")
        Integer estoque,

        @NotNull(message = "ativo e obrigatorio")
        Boolean ativo) {
}
