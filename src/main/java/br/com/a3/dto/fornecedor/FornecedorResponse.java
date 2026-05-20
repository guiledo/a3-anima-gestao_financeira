package br.com.a3.dto.fornecedor;

public record FornecedorResponse(
    Long id,
    String nome,
    String documento,
    String email,
    String telefone
) {
}
