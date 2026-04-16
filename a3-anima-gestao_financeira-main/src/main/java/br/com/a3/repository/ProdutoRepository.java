package br.com.a3.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.a3.model.Produto;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    List<Produto> findAllByOrderByNomeAsc();

    List<Produto> findByAtivoTrue();
}
