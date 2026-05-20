package br.com.a3.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "configuracao_app")
public class ConfiguracaoApp {

    @Id
    private Long id; // Teremos apenas o ID 1

    @Column(length = 100)
    private String nomeAplicacao;

    @Column(columnDefinition = "TEXT")
    private String logoBase64;

    @Column(columnDefinition = "TEXT")
    private String backgroundBase64;

    @Column(length = 50)
    private String btnTextDashboard;

    @Column(length = 50)
    private String btnTextNovaVenda;

    @Column(length = 50)
    private String btnTextNovoProduto;

    @Column(length = 50)
    private String btnTextProdutos;

    @Column(length = 50)
    private String btnTextClientes;

    @Column(length = 50)
    private String btnTextMovimentacoes;

    @Column(length = 50)
    private String btnTextUsuarios;

    @Column(length = 50)
    private String btnTextHistorico;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomeAplicacao() {
        return nomeAplicacao;
    }

    public void setNomeAplicacao(String nomeAplicacao) {
        this.nomeAplicacao = nomeAplicacao;
    }

    public String getLogoBase64() {
        return logoBase64;
    }

    public void setLogoBase64(String logoBase64) {
        this.logoBase64 = logoBase64;
    }

    public String getBackgroundBase64() {
        return backgroundBase64;
    }

    public void setBackgroundBase64(String backgroundBase64) {
        this.backgroundBase64 = backgroundBase64;
    }

    public String getBtnTextDashboard() {
        return btnTextDashboard;
    }

    public void setBtnTextDashboard(String btnTextDashboard) {
        this.btnTextDashboard = btnTextDashboard;
    }

    public String getBtnTextNovaVenda() {
        return btnTextNovaVenda;
    }

    public void setBtnTextNovaVenda(String btnTextNovaVenda) {
        this.btnTextNovaVenda = btnTextNovaVenda;
    }

    public String getBtnTextNovoProduto() { return btnTextNovoProduto; }
    public void setBtnTextNovoProduto(String btnTextNovoProduto) { this.btnTextNovoProduto = btnTextNovoProduto; }

    public String getBtnTextProdutos() { return btnTextProdutos; }
    public void setBtnTextProdutos(String btnTextProdutos) { this.btnTextProdutos = btnTextProdutos; }

    public String getBtnTextClientes() { return btnTextClientes; }
    public void setBtnTextClientes(String btnTextClientes) { this.btnTextClientes = btnTextClientes; }

    public String getBtnTextMovimentacoes() { return btnTextMovimentacoes; }
    public void setBtnTextMovimentacoes(String btnTextMovimentacoes) { this.btnTextMovimentacoes = btnTextMovimentacoes; }

    public String getBtnTextUsuarios() { return btnTextUsuarios; }
    public void setBtnTextUsuarios(String btnTextUsuarios) { this.btnTextUsuarios = btnTextUsuarios; }

    public String getBtnTextHistorico() { return btnTextHistorico; }
    public void setBtnTextHistorico(String btnTextHistorico) { this.btnTextHistorico = btnTextHistorico; }
}
