package br.com.a3.dto.cliente;

public record ClienteResponse(
    Long id,
    String nome,
    String documento,
    String email,
    String telefone,
    String endereco
) {
}
