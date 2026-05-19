package br.com.a3.dto.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record ClienteRequest(
    @NotBlank(message = "Nome e obrigatorio")
    @Size(max = 120)
    String nome,

    @NotBlank(message = "Documento (CPF) é obrigatório")
    @Pattern(regexp = "^\\d{11}$", message = "CPF deve conter exatamente 11 números, sem traços ou pontuações")
    String documento,

    @Size(max = 100)
    String email,

    @Size(max = 20)
    String telefone,

    @Size(max = 200)
    String endereco
) {
}
