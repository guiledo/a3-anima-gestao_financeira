package br.com.a3.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.model.TipoPagamento;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;
import br.com.a3.repository.ProdutoRepository;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ProdutoRepository produtoRepository;
    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final boolean seedEnabled;

    public DataInitializer(
            ProdutoRepository produtoRepository,
            MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            @Value("${app.seed.enabled:true}") boolean seedEnabled) {
        this.produtoRepository = produtoRepository;
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            return;
        }

        if (produtoRepository.count() == 0) {
            produtoRepository.saveAll(List.of(
                    produto("Notebook Dell XPS", "Informatica", "4500.00", "6800.00", 15, true),
                    produto("Monitor LG 29 Ultrawide", "Perifericos", "800.00", "1250.00", 42, true),
                    produto("Mouse Logitech MX Master 3", "Perifericos", "350.00", "599.90", 80, true),
                    produto("Cadeira Herman Miller Aeron", "Moveis", "5200.00", "8500.00", 5, true),
                    produto("Teclado Mecanico Keychron K2", "Perifericos", "450.00", "750.00", 30, true)));
        }

        if (movimentacaoFinanceiraRepository.count() == 0) {
            LocalDate hoje = LocalDate.now();

            movimentacaoFinanceiraRepository.saveAll(List.of(
                    movimentacao(TipoMovimentacao.ENTRADA, "13600.00", hoje,
                            "Venda de 2 Notebooks", "Empresa Horizon", "Vendas",
                            TipoPagamento.PARCELADO, 4, hoje),
                    movimentacao(TipoMovimentacao.SAIDA, "3500.00", hoje,
                            "Pagamento de Fornecedor Logitech", "Fornecedor Logitech", "Fornecedores",
                            TipoPagamento.AVISTA, 1, hoje),
                    movimentacao(TipoMovimentacao.ENTRADA, "1250.00", hoje,
                            "Venda 1 Monitor LG", "Studio Aurora", "Vendas",
                            TipoPagamento.AVISTA, 1, hoje),
                    movimentacao(TipoMovimentacao.SAIDA, "850.00", hoje,
                            "Conta de Energia", "Concessionaria de Energia", "Despesas Operacionais",
                            TipoPagamento.AVISTA, 1, hoje),
                    movimentacao(TipoMovimentacao.ENTRADA, "2250.00", hoje,
                            "Venda 3 Teclados Keychron", "Agencia Polaris", "Vendas",
                            TipoPagamento.PARCELADO, 3, hoje)));
        }
    }

    private Produto produto(String nome, String categoria, String custo, String preco, int estoque, boolean ativo) {
        Produto produto = new Produto();
        produto.setNome(nome);
        produto.setCategoria(categoria);
        produto.setCusto(new BigDecimal(custo));
        produto.setPreco(new BigDecimal(preco));
        produto.setEstoque(estoque);
        produto.setAtivo(ativo);
        return produto;
    }

    private MovimentacaoFinanceira movimentacao(
            TipoMovimentacao tipo,
            String valor,
            LocalDate data,
            String descricao,
            String cliente,
            String categoria,
            TipoPagamento tipoPagamento,
            int quantidadeParcelas,
            LocalDate dataPrimeiroVencimento) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setTipo(tipo);
        movimentacao.setValor(new BigDecimal(valor));
        movimentacao.setData(data);
        movimentacao.setDescricao(descricao);
        movimentacao.setCliente(cliente);
        movimentacao.setCategoria(categoria);
        movimentacao.setTipoPagamento(tipoPagamento);
        movimentacao.setQuantidadeParcelas(quantidadeParcelas);
        movimentacao.setDataPrimeiroVencimento(dataPrimeiroVencimento);
        return movimentacao;
    }
}
