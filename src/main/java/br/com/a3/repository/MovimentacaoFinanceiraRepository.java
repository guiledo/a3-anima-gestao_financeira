package br.com.a3.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    @Query("select coalesce(sum(m.valor), 0) from MovimentacaoFinanceira m where m.tipo = :tipo and m.data between :inicio and :fim")
    BigDecimal somarPorTipoEPeriodo(@Param("tipo") TipoMovimentacao tipo,
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);

    @Query("select count(m) from MovimentacaoFinanceira m where m.data between :inicio and :fim")
    long contarPorPeriodo(@Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);

    List<MovimentacaoFinanceira> findByDataBetweenAndTipo(LocalDate inicio, LocalDate fim, TipoMovimentacao tipo);

    List<MovimentacaoFinanceira> findByDataBetween(LocalDate inicio, LocalDate fim);
}
