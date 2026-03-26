package br.com.a3.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.TipoMovimentacao;

public interface MovimentacaoFinanceiraRepository extends JpaRepository<MovimentacaoFinanceira, Long> {

    List<MovimentacaoFinanceira> findAllByOrderByDataDescIdDesc();

    @Query("select coalesce(sum(m.valor), 0) from MovimentacaoFinanceira m where m.tipo = :tipo")
    BigDecimal somarPorTipo(@Param("tipo") TipoMovimentacao tipo);
}
