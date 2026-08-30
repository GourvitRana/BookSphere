package librarymanagementsystem.controller;

import librarymanagementsystem.dto.BorrowRequestDTO;
import librarymanagementsystem.dto.BorrowResponseDTO;
import librarymanagementsystem.dto.LibrarianBorrowResponseDTO;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.service.AuthService;
import librarymanagementsystem.service.BorrowingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/borrowings")
public class BorrowingController {

    private final BorrowingService borrowingService;
    private final AuthService authService;

    public BorrowingController(BorrowingService borrowingService, AuthService authService) {
        this.borrowingService = borrowingService;
        this.authService = authService;
    }

    private User getCurrentUser(Authentication authentication) {
        return authService.findByEmail(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<BorrowResponseDTO> borrow(
            @Valid @RequestBody BorrowRequestDTO requestDTO,
            Authentication authentication) {

        User currentUser = getCurrentUser(authentication);
        BorrowResponseDTO response = borrowingService.borrow(requestDTO.getBookId(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<BorrowResponseDTO>> getMyBorrowings(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<BorrowResponseDTO> borrowings = borrowingService.getMyBorrowings(currentUser);
        return ResponseEntity.ok(borrowings);
    }

    @GetMapping
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<LibrarianBorrowResponseDTO>> getAllBorrowings(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<LibrarianBorrowResponseDTO> borrowings = borrowingService.getAllBorrowingsForLibrarian();
        return ResponseEntity.ok(borrowings);
    }

    @GetMapping("/active")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<LibrarianBorrowResponseDTO>> getActiveBorrowings(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<LibrarianBorrowResponseDTO> borrowings = borrowingService.getActiveBorrowingsForLibrarian();
        return ResponseEntity.ok(borrowings);
    }

    @PutMapping("/{id}/return")
    public ResponseEntity<BorrowResponseDTO> returnBook(
            @PathVariable Long id,
            Authentication authentication) {

        User currentUser = getCurrentUser(authentication);
        boolean isLibrarian = currentUser.getRole().name().equals("LIBRARIAN");

        BorrowResponseDTO response = borrowingService.returnBook(id, currentUser, isLibrarian);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> deleteBorrowing(@PathVariable Long id) {
        borrowingService.deleteBorrowing(id);
        return ResponseEntity.ok().build();
    }
}