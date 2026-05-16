package br.com.a3.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.relatorio.DebitoMensalClienteResponse;
import br.com.a3.dto.relatorio.FechamentoClienteMovimentacaoResponse;
import br.com.a3.dto.relatorio.FechamentoClienteResponse;
import br.com.a3.dto.relatorio.MovimentacaoPorCategoriaResponse;
import br.com.a3.dto.relatorio.PeriodoResponse;
import br.com.a3.dto.relatorio.ProdutoPorCategoriaResponse;
import br.com.a3.dto.relatorio.RelatorioFinanceiroResponse;
import br.com.a3.dto.relatorio.RelatorioProdutosResponse;
import br.com.a3.dto.relatorio.RelatorioUsuarioResponse;
import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.PerfilUsuario;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional(readOnly = true)
public class RelatorioService {

    private static final DateTimeFormatter COMPETENCIA_FORMATTER = DateTimeFormatter.ofPattern("MM/yyyy");

    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final ProdutoService produtoService;
    private final UsuarioSistemaService usuarioSistemaService;

    public RelatorioService(MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            ProdutoService produtoService,
            UsuarioSistemaService usuarioSistemaService) {
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.produtoService = produtoService;
        this.usuarioSistemaService = usuarioSistemaService;
    }

    public RelatorioFinanceiroResponse gerarRelatorioFinanceiro(LocalDate inicio, LocalDate fim) {
        boolean gestor = usuarioSistemaService.usuarioLogadoEhGestor();
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        BigDecimal totalEntradas = gestor
                ? movimentacaoFinanceiraRepository.somarPorTipoEPeriodo(TipoMovimentacao.VENDA, inicio, fim)
                : movimentacaoFinanceiraRepository.somarPorTipoEPeriodo(usuarioId, TipoMovimentacao.VENDA, inicio,
                        fim);
        BigDecimal totalSaidas = gestor
                ? movimentacaoFinanceiraRepository.somarPorTipoEPeriodo(TipoMovimentacao.COMPRA, inicio, fim)
                : movimentacaoFinanceiraRepository.somarPorTipoEPeriodo(usuarioId, TipoMovimentacao.COMPRA, inicio,
                        fim);
        BigDecimal saldoPeriodo = totalEntradas.subtract(totalSaidas);
        long quantidadeMovimentacoes = gestor
                ? movimentacaoFinanceiraRepository.contarPorPeriodo(inicio, fim)
                : movimentacaoFinanceiraRepository.contarPorPeriodo(usuarioId, inicio, fim);

        long diasNoPeriodo = ChronoUnit.DAYS.between(inicio, fim) + 1;

        BigDecimal mediaDiariaEntradas = calcularMediaDiaria(totalEntradas, diasNoPeriodo);
        BigDecimal mediaDiariaSaidas = calcularMediaDiaria(totalSaidas, diasNoPeriodo);

        List<MovimentacaoPorCategoriaResponse> entradasPorCategoria = agruparPorCategoria(gestor
                ? movimentacaoFinanceiraRepository.findByDataBetweenAndTipo(inicio, fim, TipoMovimentacao.VENDA)
                : movimentacaoFinanceiraRepository.findByUsuarioIdAndDataBetweenAndTipo(usuarioId, inicio, fim,
                        TipoMovimentacao.VENDA));
        List<MovimentacaoPorCategoriaResponse> saidasPorCategoria = agruparPorCategoria(gestor
                ? movimentacaoFinanceiraRepository.findByDataBetweenAndTipo(inicio, fim, TipoMovimentacao.COMPRA)
                : movimentacaoFinanceiraRepository.findByUsuarioIdAndDataBetweenAndTipo(usuarioId, inicio, fim,
                        TipoMovimentacao.COMPRA));
        List<FechamentoClienteResponse> fechamentoPorCliente = gerarFechamentoPorCliente(inicio, fim);
        BigDecimal totalDevidoPorClientesNoPeriodo = fechamentoPorCliente.stream()
                .map(FechamentoClienteResponse::valorDevidoNoPeriodo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new RelatorioFinanceiroResponse(
                new PeriodoResponse(inicio, fim),
                totalEntradas,
                totalSaidas,
                saldoPeriodo,
                quantidadeMovimentacoes,
                mediaDiariaEntradas,
                mediaDiariaSaidas,
                entradasPorCategoria,
                saidasPorCategoria,
                fechamentoPorCliente.size(),
                totalDevidoPorClientesNoPeriodo,
                fechamentoPorCliente);
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

    public List<RelatorioUsuarioResponse> gerarRelatorioFinanceiroPorUsuario(LocalDate inicio, LocalDate fim) {
        return usuarioSistemaService.listar().stream()
                .filter(usuario -> usuario.ativo() && usuario.perfil() == PerfilUsuario.USER)
                .map(usuario -> {
                    BigDecimal totalEntradas = movimentacaoFinanceiraRepository
                            .somarPorTipoEPeriodo(usuario.id(), TipoMovimentacao.VENDA, inicio, fim);
                    BigDecimal totalSaidas = movimentacaoFinanceiraRepository
                            .somarPorTipoEPeriodo(usuario.id(), TipoMovimentacao.COMPRA, inicio, fim);

                    return new RelatorioUsuarioResponse(
                            usuario.id(),
                            usuario.nome(),
                            usuario.username(),
                            usuario.perfil().name(),
                            movimentacaoFinanceiraRepository.contarPorPeriodo(usuario.id(), inicio, fim),
                            totalEntradas,
                            totalSaidas,
                            totalEntradas.subtract(totalSaidas));
                })
                .sorted((a, b) -> b.totalEntradas().compareTo(a.totalEntradas()))
                .toList();
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

    private List<FechamentoClienteResponse> gerarFechamentoPorCliente(LocalDate inicio, LocalDate fim) {
        boolean gestor = usuarioSistemaService.usuarioLogadoEhGestor();
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        Map<String, List<MovimentacaoFinanceira>> porCliente = (gestor
                ? movimentacaoFinanceiraRepository.findByTipoOrderByClienteAscDataPrimeiroVencimentoAscIdAsc(
                        TipoMovimentacao.VENDA)
                : movimentacaoFinanceiraRepository.findByUsuarioIdAndTipoOrderByClienteAscDataPrimeiroVencimentoAscIdAsc(
                        usuarioId, TipoMovimentacao.VENDA))
                .stream()
                .collect(Collectors.groupingBy(MovimentacaoFinanceira::getCliente));

        return porCliente.entrySet().stream()
                .map(entrada -> montarFechamentoCliente(entrada.getKey(), entrada.getValue(), inicio, fim))
                .filter(fechamento -> fechamento.valorDevidoNoPeriodo().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> {
                    int valorCompare = b.valorDevidoNoPeriodo().compareTo(a.valorDevidoNoPeriodo());
                    return valorCompare != 0 ? valorCompare : a.cliente().compareToIgnoreCase(b.cliente());
                })
                .toList();
    }

    private FechamentoClienteResponse montarFechamentoCliente(String cliente, List<MovimentacaoFinanceira> movimentacoes,
            LocalDate inicio, LocalDate fim) {
        Map<YearMonth, BigDecimal> debitosMensais = new TreeMap<>();
        List<MovimentacaoFinanceira> movimentacoesRelevantes = new ArrayList<>();
        LocalDate proximoVencimento = null;

        for (MovimentacaoFinanceira movimentacao : movimentacoes) {
            boolean possuiParcelaNoPeriodo = false;

            for (ParcelaProgramada parcela : gerarParcelas(movimentacao)) {
                if (parcela.vencimento().isBefore(inicio) || parcela.vencimento().isAfter(fim)) {
                    continue;
                }

                YearMonth competencia = YearMonth.from(parcela.vencimento());
                debitosMensais.merge(competencia, parcela.valor(), BigDecimal::add);
                possuiParcelaNoPeriodo = true;

                if (proximoVencimento == null || parcela.vencimento().isBefore(proximoVencimento)) {
                    proximoVencimento = parcela.vencimento();
                }
            }

            if (possuiParcelaNoPeriodo) {
                movimentacoesRelevantes.add(movimentacao);
            }
        }

        BigDecimal valorTotalMovimentado = movimentacoesRelevantes.stream()
                .map(MovimentacaoFinanceira::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal valorDevidoNoPeriodo = debitosMensais.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new FechamentoClienteResponse(
                cliente,
                valorTotalMovimentado,
                valorDevidoNoPeriodo,
                movimentacoesRelevantes.size(),
                proximoVencimento,
                debitosMensais.entrySet().stream()
                        .map(entry -> new DebitoMensalClienteResponse(
                                entry.getKey().format(COMPETENCIA_FORMATTER),
                                entry.getValue()))
                        .toList(),
                movimentacoesRelevantes.stream()
                        .sorted((a, b) -> b.getData().compareTo(a.getData()))
                        .map(this::toFechamentoMovimentacao)
                        .toList());
    }

    private List<ParcelaProgramada> gerarParcelas(MovimentacaoFinanceira movimentacao) {
        int quantidadeParcelas = movimentacao.getQuantidadeParcelas() == null || movimentacao.getQuantidadeParcelas() < 1
                ? 1
                : movimentacao.getQuantidadeParcelas();
        BigDecimal valorBase = movimentacao.getValor()
                .divide(BigDecimal.valueOf(quantidadeParcelas), 2, RoundingMode.DOWN);
        BigDecimal restante = movimentacao.getValor()
                .subtract(valorBase.multiply(BigDecimal.valueOf(quantidadeParcelas)));

        List<ParcelaProgramada> parcelas = new ArrayList<>();
        for (int indice = 0; indice < quantidadeParcelas; indice++) {
            BigDecimal valorParcela = indice == quantidadeParcelas - 1
                    ? valorBase.add(restante)
                    : valorBase;
            parcelas.add(new ParcelaProgramada(
                    movimentacao.getDataPrimeiroVencimento().plusMonths(indice),
                    valorParcela));
        }
        return parcelas;
    }

    private FechamentoClienteMovimentacaoResponse toFechamentoMovimentacao(MovimentacaoFinanceira movimentacao) {
        return new FechamentoClienteMovimentacaoResponse(
                movimentacao.getId(),
                movimentacao.getDescricao(),
                movimentacao.getCategoria(),
                movimentacao.getValor(),
                movimentacao.getData(),
                movimentacao.getTipoPagamento(),
                movimentacao.getQuantidadeParcelas(),
                movimentacao.getDataPrimeiroVencimento());
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

    private record ParcelaProgramada(LocalDate vencimento, BigDecimal valor) {
    }
}
