package br.com.a3.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.configuracao.ConfiguracaoRequest;
import br.com.a3.dto.configuracao.ConfiguracaoResponse;
import br.com.a3.model.ConfiguracaoApp;
import br.com.a3.repository.ConfiguracaoAppRepository;

@Service
@Transactional
public class ConfiguracaoAppService {

    private final ConfiguracaoAppRepository repository;

    public ConfiguracaoAppService(ConfiguracaoAppRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ConfiguracaoResponse obterConfiguracao() {
        ConfiguracaoApp config = repository.findById(1L).orElse(null);
        if (config == null) {
            return new ConfiguracaoResponse("A3 Gestão Financeira", null, null, "Dashboard", "Nova Movimentação", "Novo Produto", "Produtos", "Clientes", "Movimentações", "Gestão de Acessos", "Histórico");
        }
        return new ConfiguracaoResponse(
                config.getNomeAplicacao(),
                config.getLogoBase64(),
                config.getBackgroundBase64(),
                config.getBtnTextDashboard(),
                config.getBtnTextNovaVenda(),
                config.getBtnTextNovoProduto(),
                config.getBtnTextProdutos(),
                config.getBtnTextClientes(),
                config.getBtnTextMovimentacoes(),
                config.getBtnTextUsuarios(),
                config.getBtnTextHistorico());
    }

    public ConfiguracaoResponse salvarConfiguracao(ConfiguracaoRequest request) {
        // Validação de segurança QA (tamanho das strings base64)
        if (request.logoBase64() != null && request.logoBase64().length() > 2800000) { // aprox 2MB
            throw new IllegalArgumentException("O arquivo da logo excedeu o limite máximo de segurança (aprox 2MB).");
        }
        if (request.backgroundBase64() != null && request.backgroundBase64().length() > 4200000) { // aprox 3MB
            throw new IllegalArgumentException("A imagem de fundo excedeu o limite máximo de segurança (aprox 3MB).");
        }

        ConfiguracaoApp config = repository.findById(1L).orElse(new ConfiguracaoApp());
        config.setId(1L);
        config.setNomeAplicacao(request.nomeAplicacao());
        config.setLogoBase64(request.logoBase64());
        config.setBackgroundBase64(request.backgroundBase64());
        config.setBtnTextDashboard(request.btnTextDashboard());
        config.setBtnTextNovaVenda(request.btnTextNovaVenda());
        config.setBtnTextNovoProduto(request.btnTextNovoProduto());
        config.setBtnTextProdutos(request.btnTextProdutos());
        config.setBtnTextClientes(request.btnTextClientes());
        config.setBtnTextMovimentacoes(request.btnTextMovimentacoes());
        config.setBtnTextUsuarios(request.btnTextUsuarios());
        config.setBtnTextHistorico(request.btnTextHistorico());

        ConfiguracaoApp salva = repository.saveAndFlush(config);

        return new ConfiguracaoResponse(
                salva.getNomeAplicacao(),
                salva.getLogoBase64(),
                salva.getBackgroundBase64(),
                salva.getBtnTextDashboard(),
                salva.getBtnTextNovaVenda(),
                salva.getBtnTextNovoProduto(),
                salva.getBtnTextProdutos(),
                salva.getBtnTextClientes(),
                salva.getBtnTextMovimentacoes(),
                salva.getBtnTextUsuarios(),
                salva.getBtnTextHistorico());
    }
}
