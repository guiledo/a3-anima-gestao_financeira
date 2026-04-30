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
import br.com.a3.model.UsuarioSistema;
import br.com.a3.model.PerfilUsuario;
import br.com.a3.dto.usuario.UsuarioRequest;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;
import br.com.a3.repository.ProdutoRepository;
import br.com.a3.repository.UsuarioSistemaRepository;
import br.com.a3.service.UsuarioSistemaService;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ProdutoRepository produtoRepository;
    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final UsuarioSistemaRepository usuarioSistemaRepository;
    private final UsuarioSistemaService usuarioSistemaService;
    private final boolean seedEnabled;

    public DataInitializer(
            ProdutoRepository produtoRepository,
            MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            UsuarioSistemaRepository usuarioSistemaRepository,
            UsuarioSistemaService usuarioSistemaService,
            @Value("${app.seed.enabled:true}") boolean seedEnabled) {
        this.produtoRepository = produtoRepository;
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.usuarioSistemaRepository = usuarioSistemaRepository;
        this.usuarioSistemaService = usuarioSistemaService;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            return;
        }

        criarUsuariosTeste();

        UsuarioSistema admin = usuarioSistemaRepository.findByUsernameIgnoreCase("a3_admin_2026")
                .orElse(null);

        if (admin != null && produtoRepository.count() == 0) {
            produtoRepository.saveAll(List.of(
                    produto("Notebook Dell XPS", "Informatica", "4500.00", "6800.00", 15, true, admin),
                    produto("Monitor LG 29 Ultrawide", "Perifericos", "800.00", "1250.00", 42, true, admin),
                    produto("Mouse Logitech MX Master 3", "Perifericos", "350.00", "599.90", 80, true, admin),
                    produto("Cadeira Herman Miller Aeron", "Moveis", "5200.00", "8500.00", 5, true, admin),
                    produto("Teclado Mecanico Keychron K2", "Perifericos", "450.00", "750.00", 30, true, admin)));
        }

        if (admin != null && movimentacaoFinanceiraRepository.count() == 0) {
            LocalDate hoje = LocalDate.now();

            movimentacaoFinanceiraRepository.saveAll(List.of(
                    movimentacao(TipoMovimentacao.ENTRADA, "13600.00", hoje,
                            "Venda de 2 Notebooks", "Empresa Horizon", "Vendas",
                            TipoPagamento.PARCELADO, 4, hoje, admin),
                    movimentacao(TipoMovimentacao.SAIDA, "3500.00", hoje,
                            "Pagamento de Fornecedor Logitech", "Fornecedor Logitech", "Fornecedores",
                            TipoPagamento.AVISTA, 1, hoje, admin),
                    movimentacao(TipoMovimentacao.ENTRADA, "1250.00", hoje,
                            "Venda 1 Monitor LG", "Studio Aurora", "Vendas",
                            TipoPagamento.AVISTA, 1, hoje, admin),
                    movimentacao(TipoMovimentacao.SAIDA, "850.00", hoje,
                            "Conta de Energia", "Concessionaria de Energia", "Despesas Operacionais",
                            TipoPagamento.AVISTA, 1, hoje, admin),
                    movimentacao(TipoMovimentacao.ENTRADA, "2250.00", hoje,
                            "Venda 3 Teclados Keychron", "Agencia Polaris", "Vendas",
                            TipoPagamento.PARCELADO, 3, hoje, admin)));
        }
    }

    private void criarUsuariosTeste() {
        for (int i = 1; i <= 6; i++) {
            String username = "usuario" + i;
            if (usuarioSistemaRepository.findByUsernameIgnoreCase(username).isEmpty()) {
                UsuarioRequest request = new UsuarioRequest(
                        "Usuario Teste " + i,
                        username,
                        "senha123",
                        PerfilUsuario.USER,
                        true);
                usuarioSistemaService.criar(request);
            }
        }
    }

    private Produto produto(String nome, String categoria, String custo, String preco, int estoque, boolean ativo, UsuarioSistema usuario) {
        Produto produto = new Produto();
        produto.setNome(nome);
        produto.setCategoria(categoria);
        produto.setCusto(new BigDecimal(custo));
        produto.setPreco(new BigDecimal(preco));
        produto.setEstoque(estoque);
        produto.setAtivo(ativo);
        produto.setUsuario(usuario);
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
            LocalDate dataPrimeiroVencimento,
            UsuarioSistema usuario) {
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
        movimentacao.setUsuario(usuario);
        return movimentacao;
    }
}
