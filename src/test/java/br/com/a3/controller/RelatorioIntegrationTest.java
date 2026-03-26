package br.com.a3.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;
import br.com.a3.repository.ProdutoRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RelatorioIntegrationTest {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @LocalServerPort
    private int port;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

    @BeforeEach
    void limparBase() {
        movimentacaoFinanceiraRepository.deleteAll();
        produtoRepository.deleteAll();
    }

    @Test
    void deveGerarRelatorioFinanceiroComTotaisEMedias() throws Exception {
        LocalDate hoje = LocalDate.now();
        movimentacaoFinanceiraRepository.save(
                criarMovimentacao(TipoMovimentacao.ENTRADA, "5000.00", "Venda produto A", "Vendas", hoje));
        movimentacaoFinanceiraRepository.save(
                criarMovimentacao(TipoMovimentacao.ENTRADA, "3000.00", "Venda produto B", "Vendas", hoje));
        movimentacaoFinanceiraRepository.save(
                criarMovimentacao(TipoMovimentacao.SAIDA, "1200.00", "Compra de material", "Compras", hoje));
        movimentacaoFinanceiraRepository.save(
                criarMovimentacao(TipoMovimentacao.SAIDA, "800.00", "Pagamento fornecedor", "Fornecedores", hoje));

        String dataInicio = hoje.minusDays(1).toString();
        String dataFim = hoje.toString();

        HttpResponse<String> resposta = get(
                "/api/v1/relatorios/financeiro?dataInicio=" + dataInicio + "&dataFim=" + dataFim);

        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = objectMapper.readTree(resposta.body());

        assertEquals(8000.0, relatorio.get("totalEntradas").asDouble());
        assertEquals(2000.0, relatorio.get("totalSaidas").asDouble());
        assertEquals(6000.0, relatorio.get("saldoPeriodo").asDouble());
        assertEquals(4, relatorio.get("quantidadeMovimentacoes").asInt());

        JsonNode periodo = relatorio.get("periodo");
        assertEquals(dataInicio, periodo.get("inicio").stringValue());
        assertEquals(dataFim, periodo.get("fim").stringValue());

        assertTrue(relatorio.get("mediaDiariaEntradas").asDouble() > 0);
        assertTrue(relatorio.get("mediaDiariaSaidas").asDouble() > 0);

        JsonNode entradasPorCategoria = relatorio.get("entradasPorCategoria");
        assertEquals(1, entradasPorCategoria.size());
        assertEquals("Vendas", entradasPorCategoria.get(0).get("categoria").stringValue());
        assertEquals(2, entradasPorCategoria.get(0).get("quantidade").asInt());
        assertEquals(8000.0, entradasPorCategoria.get(0).get("valorTotal").asDouble());

        JsonNode saidasPorCategoria = relatorio.get("saidasPorCategoria");
        assertEquals(2, saidasPorCategoria.size());
    }

    @Test
    void deveRetornarRelatorioFinanceiroVazioQuandoNaoHouverMovimentacoesNoPeriodo() throws Exception {
        LocalDate hoje = LocalDate.now();
        movimentacaoFinanceiraRepository.save(
                criarMovimentacao(TipoMovimentacao.ENTRADA, "1000.00", "Venda antiga", "Vendas", hoje.minusMonths(3)));

        String dataInicio = hoje.minusDays(7).toString();
        String dataFim = hoje.toString();

        HttpResponse<String> resposta = get(
                "/api/v1/relatorios/financeiro?dataInicio=" + dataInicio + "&dataFim=" + dataFim);

        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = objectMapper.readTree(resposta.body());

        assertEquals(0.0, relatorio.get("totalEntradas").asDouble());
        assertEquals(0.0, relatorio.get("totalSaidas").asDouble());
        assertEquals(0.0, relatorio.get("saldoPeriodo").asDouble());
        assertEquals(0, relatorio.get("quantidadeMovimentacoes").asInt());
        assertTrue(relatorio.get("entradasPorCategoria").isEmpty());
        assertTrue(relatorio.get("saidasPorCategoria").isEmpty());
    }

    @Test
    void deveGerarRelatorioProdutosComTotaisECategorias() throws Exception {
        produtoRepository.save(criarProduto("Notebook Dell", "Informatica", "3200.00", "4500.00", 5, true));
        produtoRepository.save(criarProduto("Mouse Gamer", "Informatica", "80.00", "120.00", 20, true));
        produtoRepository.save(criarProduto("Cadeira Gamer", "Moveis", "900.00", "1500.00", 3, true));
        produtoRepository.save(criarProduto("Teclado Antigo", "Informatica", "40.00", "50.00", 10, false));

        HttpResponse<String> resposta = get("/api/v1/relatorios/produtos");

        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = objectMapper.readTree(resposta.body());

        assertEquals(4, relatorio.get("totalProdutos").asInt());
        assertEquals(3, relatorio.get("totalProdutosAtivos").asInt());
        assertEquals(1, relatorio.get("totalProdutosInativos").asInt());
        assertEquals(28, relatorio.get("totalItensEmEstoque").asInt());

        BigDecimal custoEsperado = new BigDecimal("3200.00").multiply(BigDecimal.valueOf(5))
                .add(new BigDecimal("80.00").multiply(BigDecimal.valueOf(20)))
                .add(new BigDecimal("900.00").multiply(BigDecimal.valueOf(3)));
        assertEquals(custoEsperado.doubleValue(), relatorio.get("valorTotalEstoqueCusto").asDouble());

        BigDecimal vendaEsperada = new BigDecimal("4500.00").multiply(BigDecimal.valueOf(5))
                .add(new BigDecimal("120.00").multiply(BigDecimal.valueOf(20)))
                .add(new BigDecimal("1500.00").multiply(BigDecimal.valueOf(3)));
        assertEquals(vendaEsperada.doubleValue(), relatorio.get("valorTotalEstoqueVenda").asDouble());

        BigDecimal margemEsperada = vendaEsperada.subtract(custoEsperado);
        assertEquals(margemEsperada.doubleValue(), relatorio.get("margemBrutaEstoque").asDouble());

        JsonNode porCategoria = relatorio.get("porCategoria");
        assertEquals(2, porCategoria.size());
    }

    @Test
    void deveRetornarRelatorioProdutosVazioQuandoNaoHouverProdutos() throws Exception {
        HttpResponse<String> resposta = get("/api/v1/relatorios/produtos");

        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = objectMapper.readTree(resposta.body());

        assertEquals(0, relatorio.get("totalProdutos").asInt());
        assertEquals(0, relatorio.get("totalProdutosAtivos").asInt());
        assertEquals(0, relatorio.get("totalProdutosInativos").asInt());
        assertEquals(0, relatorio.get("totalItensEmEstoque").asInt());
        assertEquals(0.0, relatorio.get("valorTotalEstoqueCusto").asDouble());
        assertEquals(0.0, relatorio.get("valorTotalEstoqueVenda").asDouble());
        assertEquals(0.0, relatorio.get("margemBrutaEstoque").asDouble());
        assertTrue(relatorio.get("porCategoria").isEmpty());
    }

    @Test
    void deveRetornarErroQuandoParametrosObrigatoriosEstiveremAusentes() throws Exception {
        HttpResponse<String> resposta = get("/api/v1/relatorios/financeiro");

        assertEquals(400, resposta.statusCode());
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private Produto criarProduto(String nome, String categoria, String custo, String preco, int estoque,
            boolean ativo) {
        Produto produto = new Produto();
        produto.setNome(nome);
        produto.setCategoria(categoria);
        produto.setCusto(new BigDecimal(custo));
        produto.setPreco(new BigDecimal(preco));
        produto.setEstoque(estoque);
        produto.setAtivo(ativo);
        return produto;
    }

    private MovimentacaoFinanceira criarMovimentacao(TipoMovimentacao tipo, String valor, String descricao,
            String categoria, LocalDate data) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setTipo(tipo);
        movimentacao.setValor(new BigDecimal(valor));
        movimentacao.setData(data);
        movimentacao.setDescricao(descricao);
        movimentacao.setCategoria(categoria);
        return movimentacao;
    }
}
