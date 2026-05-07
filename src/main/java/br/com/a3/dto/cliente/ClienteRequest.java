package br.com.a3.dto.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
    @NotBlank(message = "Nome e obrigatorio")
    @Size(max = 120)
    String nome,

    @NotBlank(message = "CPF e obrigatorio")
    @Size(min = 11, max = 14, message = "CPF deve ter entre 11 e 14 caracteres")
    String cpf,

    @Size(max = 100)
    String email,

    @Size(max = 20)
    String telefone,

    @Size(max = 200)
    String endereco
) {
}
