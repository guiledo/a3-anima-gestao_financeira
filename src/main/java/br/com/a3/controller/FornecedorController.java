package br.com.a3.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import br.com.a3.dto.fornecedor.FornecedorRequest;
import br.com.a3.dto.fornecedor.FornecedorResponse;
import br.com.a3.service.FornecedorService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/fornecedores")
public class FornecedorController {

    private final FornecedorService fornecedorService;

    public FornecedorController(FornecedorService fornecedorService) {
        this.fornecedorService = fornecedorService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FornecedorResponse criar(@RequestBody @Valid FornecedorRequest request) {
        return fornecedorService.criar(request);
    }

    @GetMapping
    public List<FornecedorResponse> listar() {
        return fornecedorService.listar();
    }

    @GetMapping("/{id}")
    public FornecedorResponse buscarPorId(@PathVariable Long id) {
        return fornecedorService.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public FornecedorResponse atualizar(@PathVariable Long id, @RequestBody @Valid FornecedorRequest request) {
        return fornecedorService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        fornecedorService.excluir(id);
    }
}
