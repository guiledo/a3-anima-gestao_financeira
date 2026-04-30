package br.com.a3.dto.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SenhaAlteracaoRequest(
        @NotBlank(message = "senha atual e obrigatoria")
        String senhaAtual,

        @NotBlank(message = "nova senha e obrigatoria")
        @Size(min = 8, max = 72, message = "nova senha deve ter entre 8 e 72 caracteres")
        String novaSenha) {
}
