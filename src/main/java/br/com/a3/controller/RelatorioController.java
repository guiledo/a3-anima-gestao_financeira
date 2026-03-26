package br.com.a3.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.a3.dto.relatorio.RelatorioFinanceiroResponse;
import br.com.a3.dto.relatorio.RelatorioProdutosResponse;
import br.com.a3.service.RelatorioService;

@RestController
@RequestMapping("/api/v1/relatorios")
public class RelatorioController {

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    @GetMapping("/financeiro")
    public RelatorioFinanceiroResponse relatorioFinanceiro(
            @RequestParam("dataInicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam("dataFim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return relatorioService.gerarRelatorioFinanceiro(dataInicio, dataFim);
    }

    @GetMapping("/produtos")
    public RelatorioProdutosResponse relatorioProdutos() {
        return relatorioService.gerarRelatorioProdutos();
    }
}
