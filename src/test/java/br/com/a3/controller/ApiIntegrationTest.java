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

    @BeforeEach
    void limparBase() {
        movimentacaoFinanceiraRepository.deleteAll();
        produtoRepository.deleteAll();
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
                  "categoria": "Vendas"
                }
                """.formatted(LocalDate.now());

        HttpResponse<String> respostaCriacao = post("/api/v1/movimentacoes", requestBody);

        assertEquals(201, respostaCriacao.statusCode());
        JsonNode movimentacaoCriada = objectMapper.readTree(respostaCriacao.body());
        assertTrue(movimentacaoCriada.get("id").isNumber());
        assertEquals("ENTRADA", movimentacaoCriada.get("tipo").stringValue());
        assertEquals(1500.0, movimentacaoCriada.get("valor").asDouble());
        assertEquals("Vendas", movimentacaoCriada.get("categoria").stringValue());

        HttpResponse<String> respostaLista = get("/api/v1/movimentacoes");

        assertEquals(200, respostaLista.statusCode());
        JsonNode listaMovimentacoes = objectMapper.readTree(respostaLista.body());
        assertEquals(1, listaMovimentacoes.size());
        assertEquals("Venda do dia", listaMovimentacoes.get(0).get("descricao").stringValue());
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

        movimentacaoFinanceiraRepository.save(criarMovimentacao(TipoMovimentacao.ENTRADA, "1000.00", "Recebimento"));
        movimentacaoFinanceiraRepository.save(criarMovimentacao(TipoMovimentacao.SAIDA, "250.00", "Compra de estoque"));

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

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
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

    private MovimentacaoFinanceira criarMovimentacao(TipoMovimentacao tipo, String valor, String descricao) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setTipo(tipo);
        movimentacao.setValor(new BigDecimal(valor));
        movimentacao.setData(LocalDate.now());
        movimentacao.setDescricao(descricao);
        movimentacao.setCategoria("Operacional");
        return movimentacao;
    }
}
