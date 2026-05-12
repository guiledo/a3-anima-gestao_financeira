package br.com.a3.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import br.com.a3.model.Produto;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    List<Produto> findAllByOrderByNomeAsc();

    List<Produto> findByAtivoTrueOrderByNomeAsc();

    List<Produto> findAllByUsuarioIdOrderByNomeAsc(Long usuarioId);

    List<Produto> findByUsuarioIdAndAtivoTrueOrderByNomeAsc(Long usuarioId);

    List<Produto> findByUsuarioId(Long usuarioId);

    @Query("SELECT p FROM Produto p WHERE p.usuario.id = :usuarioId AND (p.ativo = true OR p.ativo IS NULL)")
    List<Produto> findAtivosByUsuario(@Param("usuarioId") Long usuarioId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE produtos SET estoque = estoque - :qtd WHERE id = :id", nativeQuery = true)
    void deduzirEstoque(@Param("id") Long id, @Param("qtd") int qtd);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE produtos SET estoque = estoque + :qtd WHERE id = :id", nativeQuery = true)
    void incrementarEstoque(@Param("id") Long id, @Param("qtd") int qtd);
}
