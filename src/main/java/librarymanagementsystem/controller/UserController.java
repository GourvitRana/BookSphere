package librarymanagementsystem.controller;

import librarymanagementsystem.dto.UserResponseDTO;
import librarymanagementsystem.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<UserResponseDTO>> getAllUsers(Authentication authentication) {
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/customers")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<UserResponseDTO>> getAllCustomers(Authentication authentication) {
        List<UserResponseDTO> users = userService.getAllMembers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable Long id, Authentication authentication) {
        UserResponseDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
}