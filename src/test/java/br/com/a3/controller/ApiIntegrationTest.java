package br.com.a3.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoPagamento;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;
import br.com.a3.repository.ProdutoRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiIntegrationTest {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @LocalServerPort
    private int port;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

    private String sessionCookie;

    @BeforeEach
    void limparBase() throws Exception {
        movimentacaoFinanceiraRepository.deleteAll();
        produtoRepository.deleteAll();
        sessionCookie = loginAsSuperuser();
    }

    @Test
    void deveCriarProdutoComSucesso() throws Exception {
        String requestBody = """
                {
                  "nome": "Notebook Dell",
                  "categoria": "Informatica",
                  "custo": 3200.00,
                  "preco": 4500.00,
                  "estoque": 8,
                  "ativo": true
                }
                """;

        HttpResponse<String> respostaCriacao = post("/api/v1/produtos", requestBody);

        assertEquals(201, respostaCriacao.statusCode());
        JsonNode produtoCriado = objectMapper.readTree(respostaCriacao.body());
        assertTrue(produtoCriado.get("id").isNumber());
        assertEquals("Notebook Dell", produtoCriado.get("nome").stringValue());
        assertEquals("Informatica", produtoCriado.get("categoria").stringValue());
        assertEquals(8, produtoCriado.get("estoque").asInt());
        assertTrue(produtoCriado.get("ativo").asBoolean());

        HttpResponse<String> respostaLista = get("/api/v1/produtos");

        assertEquals(200, respostaLista.statusCode());
        JsonNode listaProdutos = objectMapper.readTree(respostaLista.body());
        assertEquals(1, listaProdutos.size());
        assertEquals("Notebook Dell", listaProdutos.get(0).get("nome").stringValue());
    }

    @Test
    void deveCriarMovimentacaoFinanceiraComSucesso() throws Exception {
        String requestBody = """
                {
                  "tipo": "ENTRADA",
                  "valor": 1500.00,
                  "data": "%s",
                  "descricao": "Venda do dia",
                  "cliente": "Cliente XPTO",
                  "categoria": "Vendas",
                  "tipoPagamento": "PARCELADO",
                  "quantidadeParcelas": 3,
                  "dataPrimeiroVencimento": "%s"
                }
                """.formatted(LocalDate.now(), LocalDate.now().plusDays(7));

        HttpResponse<String> respostaCriacao = post("/api/v1/movimentacoes", requestBody);

        assertEquals(201, respostaCriacao.statusCode());
        JsonNode movimentacaoCriada = objectMapper.readTree(respostaCriacao.body());
        assertTrue(movimentacaoCriada.get("id").isNumber());
        assertEquals("ENTRADA", movimentacaoCriada.get("tipo").stringValue());
        assertEquals(1500.0, movimentacaoCriada.get("valor").asDouble());
        assertEquals("Cliente XPTO", movimentacaoCriada.get("cliente").stringValue());
        assertEquals("Vendas", movimentacaoCriada.get("categoria").stringValue());
        assertEquals("PARCELADO", movimentacaoCriada.get("tipoPagamento").stringValue());
        assertEquals(3, movimentacaoCriada.get("quantidadeParcelas").asInt());

        HttpResponse<String> respostaLista = get("/api/v1/movimentacoes");

        assertEquals(200, respostaLista.statusCode());
        JsonNode listaMovimentacoes = objectMapper.readTree(respostaLista.body());
        assertEquals(1, listaMovimentacoes.size());
        assertEquals("Venda do dia", listaMovimentacoes.get(0).get("descricao").stringValue());
        assertEquals("Cliente XPTO", listaMovimentacoes.get(0).get("cliente").stringValue());
    }

    @Test
    void deveRetornarErroDeValidacaoQuandoProdutoForInvalido() throws Exception {
        String requestBody = """
                {
                  "nome": "",
                  "categoria": "",
                  "custo": -1,
                  "preco": -2,
                  "estoque": -3,
                  "ativo": true
                }
                """;

        HttpResponse<String> resposta = post("/api/v1/produtos", requestBody);

        assertEquals(400, resposta.statusCode());
        JsonNode erro = objectMapper.readTree(resposta.body());
        assertEquals("Falha de validacao", erro.get("title").stringValue());
        assertTrue(erro.get("errors").isArray());
        assertFalse(erro.get("errors").isEmpty());
    }

    @Test
    void deveGerarResumoDashboardComSaldoEEstoque() throws Exception {
        produtoRepository.save(criarProduto("Mouse Gamer", "Perifericos", "80.00", "120.00", 10, true));
        produtoRepository.save(criarProduto("Teclado Antigo", "Perifericos", "40.00", "50.00", 2, false));

        movimentacaoFinanceiraRepository.save(criarMovimentacao(
                TipoMovimentacao.ENTRADA,
                "1000.00",
                "Recebimento",
                "Cliente A",
                TipoPagamento.AVISTA,
                1,
                LocalDate.now()));
        movimentacaoFinanceiraRepository.save(criarMovimentacao(
                TipoMovimentacao.SAIDA,
                "250.00",
                "Compra de estoque",
                "Fornecedor B",
                TipoPagamento.AVISTA,
                1,
                LocalDate.now()));

        HttpResponse<String> resposta = get("/api/v1/dashboard/resumo");

        assertEquals(200, resposta.statusCode());
        JsonNode resumo = objectMapper.readTree(resposta.body());
        assertEquals(1000.0, resumo.get("totalEntradas").asDouble());
        assertEquals(250.0, resumo.get("totalSaidas").asDouble());
        assertEquals(750.0, resumo.get("saldoAtual").asDouble());
        assertEquals(1, resumo.get("totalProdutosAtivos").asInt());
        assertEquals(10, resumo.get("totalItensEmEstoque").asInt());
        assertEquals(1200.0, resumo.get("valorTotalEstoque").asDouble());
        assertEquals(2, resumo.get("totalMovimentacoes").asInt());
    }

    @Test
    void deveGerarFechamentoPorClienteNoRelatorioFinanceiro() throws Exception {
        movimentacaoFinanceiraRepository.save(criarMovimentacao(
                TipoMovimentacao.ENTRADA,
                "300.00",
                "Servico recorrente",
                "Cliente Alfa",
                TipoPagamento.PARCELADO,
                3,
                LocalDate.of(2026, 4, 10)));
        movimentacaoFinanceiraRepository.save(criarMovimentacao(
                TipoMovimentacao.ENTRADA,
                "100.00",
                "Taxa unica",
                "Cliente Alfa",
                TipoPagamento.AVISTA,
                1,
                LocalDate.of(2026, 4, 15)));
        movimentacaoFinanceiraRepository.save(criarMovimentacao(
                TipoMovimentacao.ENTRADA,
                "200.00",
                "Projeto especial",
                "Cliente Beta",
                TipoPagamento.PARCELADO,
                2,
                LocalDate.of(2026, 5, 5)));

        HttpResponse<String> resposta = get("/api/v1/relatorios/financeiro?dataInicio=2026-04-01&dataFim=2026-05-31");

        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = objectMapper.readTree(resposta.body());
        assertEquals(2, relatorio.get("totalClientesComDebitos").asInt());
        assertEquals(400.0, relatorio.get("totalDevidoPorClientesNoPeriodo").asDouble());

        JsonNode clientes = relatorio.get("fechamentoPorCliente");
        assertEquals(2, clientes.size());
        assertEquals("Cliente Alfa", clientes.get(0).get("cliente").stringValue());
        assertEquals(300.0, clientes.get(0).get("valorDevidoNoPeriodo").asDouble());
        assertEquals("04/2026", clientes.get(0).get("debitosMensais").get(0).get("competencia").stringValue());
        assertEquals(200.0, clientes.get(0).get("debitosMensais").get(0).get("valorDevido").asDouble());
    }

    @Test
    void deveRetornarStackDeInfraestrutura() throws Exception {
        HttpResponse<String> resposta = get("/api/v1/infra/stack");

        assertEquals(200, resposta.statusCode());

        JsonNode payload = objectMapper.readTree(resposta.body());
        assertEquals("a3-anima-gestao_financeira", payload.get("application").get("name").stringValue());
        assertEquals("H2", payload.get("database").get("engine").stringValue());
        assertTrue(payload.get("database").get("consoleEnabled").asBoolean());
        assertEquals("/api/v1", payload.get("access").get("apiBasePath").stringValue());
        assertTrue(payload.get("stack").isArray());
        assertTrue(payload.get("endpoints").isArray());
        assertTrue(payload.get("warnings").isArray());
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header(HttpHeaders.COOKIE, sessionCookie)
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String loginAsSuperuser() throws Exception {
        String requestBody = """
                {
                  "username": "a3_admin_2026",
                  "password": "Kx9#mP2$vL5nQ8wR!jF7hT4yB6cN1zA3"
                }
                """;

        HttpRequest request = HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
        return response.headers()
                .firstValue(HttpHeaders.SET_COOKIE)
                .map(cookie -> cookie.split(";", 2)[0])
                .orElseThrow(() -> new AssertionError("Sessao de autenticacao nao foi criada."));
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private Produto criarProduto(String nome, String categoria, String custo, String preco, int estoque, boolean ativo) {
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
            String cliente, TipoPagamento tipoPagamento, int quantidadeParcelas, LocalDate dataPrimeiroVencimento) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setTipo(tipo);
        movimentacao.setValor(new BigDecimal(valor));
        movimentacao.setData(LocalDate.now());
        movimentacao.setDescricao(descricao);
        movimentacao.setCliente(cliente);
        movimentacao.setCategoria("Operacional");
        movimentacao.setTipoPagamento(tipoPagamento);
        movimentacao.setQuantidadeParcelas(quantidadeParcelas);
        movimentacao.setDataPrimeiroVencimento(dataPrimeiroVencimento);
        return movimentacao;
    }
}
