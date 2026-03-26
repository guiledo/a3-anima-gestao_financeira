package br.com.a3.exception;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import br.com.a3.dto.erro.CampoErroResponse;
import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(RecursoNaoEncontradoException ex,
            HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problemDetail.setTitle("Recurso nao encontrado");
        problemDetail.setDetail(ex.getMessage());
        problemDetail.setType(URI.create("https://a3.local/problems/recurso-nao-encontrado"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problemDetail);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        List<CampoErroResponse> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toCampoErro)
                .toList();

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problemDetail.setTitle("Falha de validacao");
        problemDetail.setDetail("Um ou mais campos sao invalidos.");
        problemDetail.setType(URI.create("https://a3.local/problems/validacao"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<ProblemDetail> handleBadRequest(Exception ex, HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problemDetail.setTitle("Requisicao invalida");
        problemDetail.setDetail("O corpo ou os parametros da requisicao nao puderam ser processados.");
        problemDetail.setType(URI.create("https://a3.local/problems/requisicao-invalida"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception ex, HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problemDetail.setTitle("Erro interno");
        problemDetail.setDetail("Ocorreu um erro inesperado ao processar a requisicao.");
        problemDetail.setType(URI.create("https://a3.local/problems/erro-interno"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
    }

    private CampoErroResponse toCampoErro(FieldError fieldError) {
        return new CampoErroResponse(fieldError.getField(), fieldError.getDefaultMessage());
    }
}
