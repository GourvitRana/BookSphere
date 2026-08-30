package librarymanagementsystem.exception;

import librarymanagementsystem.dto.ErrorResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleResourceNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponseDTO> handleInvalidCredentials(InvalidCredentialsException ex) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponseDTO> handleEmailAlreadyExists(EmailAlreadyExistsException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(BookNotAvailableException.class)
    public ResponseEntity<ErrorResponseDTO> handleBookNotAvailable(BookNotAvailableException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(BookHasBorrowingsException.class)
    public ResponseEntity<ErrorResponseDTO> handleBookHasBorrowings(BookHasBorrowingsException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(AccountDeactivatedException.class)
    public ResponseEntity<ErrorResponseDTO> handleAccountDeactivated(AccountDeactivatedException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MemberHasActiveBorrowingsException.class)
    public ResponseEntity<ErrorResponseDTO> handleMemberHasActiveBorrowings(MemberHasActiveBorrowingsException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MemberHasHistoryException.class)
    public ResponseEntity<ErrorResponseDTO> handleMemberHasHistory(MemberHasHistoryException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(LibrarianDeactivationException.class)
    public ResponseEntity<ErrorResponseDTO> handleLibrarianDeactivation(LibrarianDeactivationException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(BorrowingNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleBorrowingNotFound(BorrowingNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BorrowingAlreadyReturnedException.class)
    public ResponseEntity<ErrorResponseDTO> handleBorrowingAlreadyReturned(BorrowingAlreadyReturnedException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedBorrowingOperationException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnauthorizedBorrowing(UnauthorizedBorrowingOperationException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ErrorResponseDTO> handleAccessDenied(Exception ex) {
        return build(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDTO> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("Validation failed");
        return build(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again later.");
    }

    private ResponseEntity<ErrorResponseDTO> build(HttpStatus status, String message) {
        ErrorResponseDTO error = ErrorResponseDTO.builder()
                .status(status.value())
                .message(message)
                .timestamp(System.currentTimeMillis())
                .build();
        return new ResponseEntity<>(error, status);
    }
}