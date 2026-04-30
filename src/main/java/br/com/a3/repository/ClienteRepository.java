package br.com.a3.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.a3.model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    @Query("SELECT c FROM Cliente c WHERE c.usuario.id = :usuarioId ORDER BY c.nome ASC")
    List<Cliente> findAllByUsuarioIdOrderByNomeAsc(@Param("usuarioId") Long usuarioId);
}
