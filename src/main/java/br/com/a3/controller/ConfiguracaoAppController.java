package br.com.a3.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.a3.dto.configuracao.ConfiguracaoRequest;
import br.com.a3.dto.configuracao.ConfiguracaoResponse;
import br.com.a3.service.ConfiguracaoAppService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/config")
public class ConfiguracaoAppController {

    private final ConfiguracaoAppService service;

    public ConfiguracaoAppController(ConfiguracaoAppService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ConfiguracaoResponse> getConfiguracao() {
        return ResponseEntity.ok(service.obterConfiguracao());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('SUPERUSER')")
    public ResponseEntity<ConfiguracaoResponse> atualizarConfiguracao(@RequestBody @Valid ConfiguracaoRequest request) {
        return ResponseEntity.ok(service.salvarConfiguracao(request));
    }
}
