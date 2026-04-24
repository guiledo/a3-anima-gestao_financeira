package br.com.a3.dto.usuario;

import br.com.a3.model.PerfilUsuario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UsuarioAtualizacaoRequest(
        @NotBlank(message = "nome e obrigatorio")
        @Size(max = 120, message = "nome deve ter no maximo 120 caracteres")
        String nome,

        @NotBlank(message = "username e obrigatorio")
        @Size(max = 60, message = "username deve ter no maximo 60 caracteres")
        String username,

        @Size(min = 8, max = 72, message = "password deve ter entre 8 e 72 caracteres")
        String password,

        @NotNull(message = "perfil e obrigatorio")
        PerfilUsuario perfil,

        @NotNull(message = "ativo e obrigatorio")
        Boolean ativo) {
}
