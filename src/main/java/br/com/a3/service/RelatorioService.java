package br.com.a3.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.relatorio.MovimentacaoPorCategoriaResponse;
import br.com.a3.dto.relatorio.PeriodoResponse;
import br.com.a3.dto.relatorio.ProdutoPorCategoriaResponse;
import br.com.a3.dto.relatorio.RelatorioFinanceiroResponse;
import br.com.a3.dto.relatorio.RelatorioProdutosResponse;
import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional(readOnly = true)
public class RelatorioService {

    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final ProdutoService produtoService;

    public RelatorioService(MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            ProdutoService produtoService) {
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.produtoService = produtoService;
    }

    public RelatorioFinanceiroResponse gerarRelatorioFinanceiro(LocalDate inicio, LocalDate fim) {
        BigDecimal totalEntradas = movimentacaoFinanceiraRepository
                .somarPorTipoEPeriodo(TipoMovimentacao.ENTRADA, inicio, fim);
        BigDecimal totalSaidas = movimentacaoFinanceiraRepository
                .somarPorTipoEPeriodo(TipoMovimentacao.SAIDA, inicio, fim);
        BigDecimal saldoPeriodo = totalEntradas.subtract(totalSaidas);
        long quantidadeMovimentacoes = movimentacaoFinanceiraRepository.contarPorPeriodo(inicio, fim);

        long diasNoPeriodo = ChronoUnit.DAYS.between(inicio, fim) + 1;

        BigDecimal mediaDiariaEntradas = calcularMediaDiaria(totalEntradas, diasNoPeriodo);
        BigDecimal mediaDiariaSaidas = calcularMediaDiaria(totalSaidas, diasNoPeriodo);

        List<MovimentacaoPorCategoriaResponse> entradasPorCategoria = agruparPorCategoria(
                movimentacaoFinanceiraRepository.findByDataBetweenAndTipo(inicio, fim, TipoMovimentacao.ENTRADA));
        List<MovimentacaoPorCategoriaResponse> saidasPorCategoria = agruparPorCategoria(
                movimentacaoFinanceiraRepository.findByDataBetweenAndTipo(inicio, fim, TipoMovimentacao.SAIDA));

        return new RelatorioFinanceiroResponse(
                new PeriodoResponse(inicio, fim),
                totalEntradas,
                totalSaidas,
                saldoPeriodo,
                quantidadeMovimentacoes,
                mediaDiariaEntradas,
                mediaDiariaSaidas,
                entradasPorCategoria,
                saidasPorCategoria);
    }

    public RelatorioProdutosResponse gerarRelatorioProdutos() {
        List<Produto> todosOsProdutos = produtoService.listarTodos();
        List<Produto> produtosAtivos = todosOsProdutos.stream()
                .filter(Produto::getAtivo)
                .toList();
        List<Produto> produtosInativos = todosOsProdutos.stream()
                .filter(produto -> !produto.getAtivo())
                .toList();

        long totalItensEmEstoque = produtosAtivos.stream()
                .mapToLong(Produto::getEstoque)
                .sum();

        BigDecimal valorTotalEstoqueCusto = produtosAtivos.stream()
                .map(produto -> produto.getCusto().multiply(BigDecimal.valueOf(produto.getEstoque())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal valorTotalEstoqueVenda = produtosAtivos.stream()
                .map(produto -> produto.getPreco().multiply(BigDecimal.valueOf(produto.getEstoque())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal margemBrutaEstoque = valorTotalEstoqueVenda.subtract(valorTotalEstoqueCusto);

        List<ProdutoPorCategoriaResponse> porCategoria = agruparProdutosPorCategoria(produtosAtivos);

        return new RelatorioProdutosResponse(
                todosOsProdutos.size(),
                produtosAtivos.size(),
                produtosInativos.size(),
                totalItensEmEstoque,
                valorTotalEstoqueCusto,
                valorTotalEstoqueVenda,
                margemBrutaEstoque,
                porCategoria);
    }

    private BigDecimal calcularMediaDiaria(BigDecimal valorTotal, long dias) {
        if (dias <= 0 || valorTotal.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return valorTotal.divide(BigDecimal.valueOf(dias), 2, RoundingMode.HALF_UP);
    }

    private List<MovimentacaoPorCategoriaResponse> agruparPorCategoria(List<MovimentacaoFinanceira> movimentacoes) {
        Map<String, List<MovimentacaoFinanceira>> agrupadas = movimentacoes.stream()
                .collect(Collectors.groupingBy(MovimentacaoFinanceira::getCategoria));

        return agrupadas.entrySet().stream()
                .map(entrada -> new MovimentacaoPorCategoriaResponse(
                        entrada.getKey(),
                        entrada.getValue().size(),
                        entrada.getValue().stream()
                                .map(MovimentacaoFinanceira::getValor)
                                .reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted((a, b) -> b.valorTotal().compareTo(a.valorTotal()))
                .toList();
    }

    private List<ProdutoPorCategoriaResponse> agruparProdutosPorCategoria(List<Produto> produtos) {
        Map<String, List<Produto>> agrupados = produtos.stream()
                .collect(Collectors.groupingBy(Produto::getCategoria));

        return agrupados.entrySet().stream()
                .map(entrada -> {
                    List<Produto> produtosDaCategoria = entrada.getValue();
                    long quantidadeItens = produtosDaCategoria.stream()
                            .mapToLong(Produto::getEstoque)
                            .sum();
                    BigDecimal valorCusto = produtosDaCategoria.stream()
                            .map(p -> p.getCusto().multiply(BigDecimal.valueOf(p.getEstoque())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal valorVenda = produtosDaCategoria.stream()
                            .map(p -> p.getPreco().multiply(BigDecimal.valueOf(p.getEstoque())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new ProdutoPorCategoriaResponse(
                            entrada.getKey(),
                            produtosDaCategoria.size(),
                            quantidadeItens,
                            valorCusto,
                            valorVenda);
                })
                .sorted((a, b) -> b.valorEstoqueVenda().compareTo(a.valorEstoqueVenda()))
                .toList();
    }
}
