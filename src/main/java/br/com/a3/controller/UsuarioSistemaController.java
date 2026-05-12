package br.com.a3.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import br.com.a3.dto.usuario.SenhaAlteracaoRequest;
import br.com.a3.dto.usuario.UsuarioAtualizacaoRequest;
import br.com.a3.dto.usuario.UsuarioRequest;
import br.com.a3.dto.usuario.UsuarioResponse;
import br.com.a3.service.UsuarioSistemaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.ResponseStatus;

@Validated
@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioSistemaController {

    private final UsuarioSistemaService usuarioSistemaService;

    public UsuarioSistemaController(UsuarioSistemaService usuarioSistemaService) {
        this.usuarioSistemaService = usuarioSistemaService;
    }

    @GetMapping
    public List<UsuarioResponse> listar() {
        return usuarioSistemaService.listar();
    }

    @PutMapping("/me/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void alterarMinhaSenha(@Valid @RequestBody SenhaAlteracaoRequest request) {
        usuarioSistemaService.alterarSenha(request);
    }

    @GetMapping("/{id}")
    public UsuarioResponse buscarPorId(@PathVariable Long id) {
        return usuarioSistemaService.buscarPorId(id);
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> criar(@Valid @RequestBody UsuarioRequest request) {
        UsuarioResponse response = usuarioSistemaService.criar(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public UsuarioResponse atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioAtualizacaoRequest request) {
        return usuarioSistemaService.atualizar(id, request);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        usuarioSistemaService.excluir(id);
    }
}
