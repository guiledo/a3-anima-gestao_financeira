package br.com.a3.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.a3.model.Fornecedor;

public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {
    List<Fornecedor> findAllByOrderByNomeAsc();

    @Query("SELECT f FROM Fornecedor f WHERE f.usuario.id = :usuarioId ORDER BY f.nome ASC")
    List<Fornecedor> findAllByUsuarioIdOrderByNomeAsc(@Param("usuarioId") Long usuarioId);

    @Modifying
    @Query("UPDATE Fornecedor f SET f.usuario = :novoUsuario WHERE f.usuario.id = :antigoUsuarioId")
    void reatribuirPropriedade(@Param("antigoUsuarioId") Long antigoUsuarioId, @Param("novoUsuario") br.com.a3.model.UsuarioSistema novoUsuario);
}
