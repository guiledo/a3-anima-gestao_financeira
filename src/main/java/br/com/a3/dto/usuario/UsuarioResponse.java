package br.com.a3.dto.usuario;

import java.time.LocalDateTime;

import br.com.a3.model.PerfilUsuario;

public record UsuarioResponse(
        Long id,
        String nome,
        String username,
        PerfilUsuario perfil,
        Boolean ativo,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm) {
}
