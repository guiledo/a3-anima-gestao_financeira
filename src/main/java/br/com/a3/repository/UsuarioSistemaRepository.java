package br.com.a3.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.a3.model.PerfilUsuario;
import br.com.a3.model.UsuarioSistema;

public interface UsuarioSistemaRepository extends JpaRepository<UsuarioSistema, Long> {

    Optional<UsuarioSistema> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    long countByPerfilAndAtivoTrue(PerfilUsuario perfil);

    List<UsuarioSistema> findAllByOrderByNomeAsc();
}
