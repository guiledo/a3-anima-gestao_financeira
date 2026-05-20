package br.com.a3.dto.fornecedor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record FornecedorRequest(
    @NotBlank(message = "Nome é obrigatorio")
    @Size(max = 120)
    String nome,

    @NotBlank(message = "Documento (CNPJ) é obrigatório")
    @Pattern(regexp = "^\\d{14}$", message = "CNPJ deve conter exatamente 14 números, sem traços ou pontuações")
    String documento,

    @Size(max = 100)
    String email,

    @Size(max = 20)
    String telefone
) {
}
