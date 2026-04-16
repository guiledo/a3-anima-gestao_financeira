package br.com.a3.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraRequest;
import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraResponse;
import br.com.a3.service.MovimentacaoFinanceiraService;
import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/movimentacoes")
public class MovimentacaoFinanceiraController {

    private final MovimentacaoFinanceiraService movimentacaoFinanceiraService;

    public MovimentacaoFinanceiraController(MovimentacaoFinanceiraService movimentacaoFinanceiraService) {
        this.movimentacaoFinanceiraService = movimentacaoFinanceiraService;
    }

    @PostMapping
    public ResponseEntity<MovimentacaoFinanceiraResponse> criar(
            @Valid @RequestBody MovimentacaoFinanceiraRequest request) {
        MovimentacaoFinanceiraResponse response = movimentacaoFinanceiraService.criar(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public List<MovimentacaoFinanceiraResponse> listar() {
        return movimentacaoFinanceiraService.listar();
    }

    @GetMapping("/{id}")
    public MovimentacaoFinanceiraResponse buscarPorId(@PathVariable Long id) {
        return movimentacaoFinanceiraService.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public MovimentacaoFinanceiraResponse atualizar(@PathVariable Long id,
            @Valid @RequestBody MovimentacaoFinanceiraRequest request) {
        return movimentacaoFinanceiraService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        movimentacaoFinanceiraService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
