package br.com.a3.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "username e obrigatorio")
        @Size(max = 60, message = "username deve ter no maximo 60 caracteres")
        String username,

        @NotBlank(message = "password e obrigatoria")
        @Size(max = 72, message = "password deve ter no maximo 72 caracteres")
        String password) {
}
