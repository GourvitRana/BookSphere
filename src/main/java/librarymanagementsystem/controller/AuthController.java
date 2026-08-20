package librarymanagementsystem.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import librarymanagementsystem.dto.AuthResponseDTO;
import librarymanagementsystem.dto.LoginRequestDTO;
import librarymanagementsystem.dto.RegisterRequestDTO;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // POST /auth/register - creates a CUSTOMER account.
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO dto) {
        User user = authService.register(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(user, "Registration successful. Please login."));
    }

    // POST /auth/login - authenticates and establishes a session.
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto,
                                                 HttpServletRequest request) {
        User user = authService.login(dto);
        establishSession(request, user);
        return ResponseEntity.ok(toResponse(user, "Login successful."));
    }

    // POST /auth/logout - invalidates the session.
    @PostMapping("/logout")
    public ResponseEntity<AuthResponseDTO> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(AuthResponseDTO.builder().message("Logged out successfully.").build());
    }

    // GET /auth/me - returns the currently authenticated user (HTTP 401 when not authenticated).
    @GetMapping("/me")
    public ResponseEntity<AuthResponseDTO> me(org.springframework.security.core.Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.findByEmail(authentication.getName());
        return ResponseEntity.ok(toResponse(user, null));
    }

    // Store the authentication in both the context and the session so it survives
    // subsequent requests (session-based authentication).
    private void establishSession(HttpServletRequest request, User user) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        request.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
    }

    // Map a User to the response DTO. The password is never included.
    private AuthResponseDTO toResponse(User user, String message) {
        return AuthResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .message(message)
                .build();
    }
}