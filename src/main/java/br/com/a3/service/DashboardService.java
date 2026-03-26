package br.com.a3.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.dashboard.ResumoDashboardResponse;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ProdutoService produtoService;
    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

    public DashboardService(ProdutoService produtoService,
            MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository) {
        this.produtoService = produtoService;
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
    }

    public ResumoDashboardResponse gerarResumo() {
        BigDecimal totalEntradas = valorOuZero(
                movimentacaoFinanceiraRepository.somarPorTipo(TipoMovimentacao.ENTRADA));
        BigDecimal totalSaidas = valorOuZero(
                movimentacaoFinanceiraRepository.somarPorTipo(TipoMovimentacao.SAIDA));

        List<Produto> produtosAtivos = produtoService.listarProdutosAtivos();

        long totalItensEmEstoque = produtosAtivos.stream()
                .mapToLong(Produto::getEstoque)
                .sum();

        BigDecimal valorTotalEstoque = produtosAtivos.stream()
                .map(produto -> produto.getPreco().multiply(BigDecimal.valueOf(produto.getEstoque())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ResumoDashboardResponse(
                totalEntradas,
                totalSaidas,
                totalEntradas.subtract(totalSaidas),
                produtosAtivos.size(),
                totalItensEmEstoque,
                valorTotalEstoque,
                movimentacaoFinanceiraRepository.count());
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }
}
