package librarymanagementsystem.service;

import librarymanagementsystem.dto.LoginRequestDTO;
import librarymanagementsystem.dto.RegisterRequestDTO;
import librarymanagementsystem.entity.Role;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.exception.EmailAlreadyExistsException;
import librarymanagementsystem.exception.InvalidCredentialsException;
import librarymanagementsystem.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Register a new customer. Registration always creates a CUSTOMER.
    public User register(RegisterRequestDTO dto) {
        String email = dto.getEmail().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("An account with this email already exists.");
        }

        User user = User.builder()
                .name(dto.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(Role.CUSTOMER)
                .build();

        return userRepository.save(user);
    }

    // Authenticate a user by email and password.
    public User login(LoginRequestDTO dto) {
        String email = dto.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password."));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password.");
        }

        return user;
    }

    // Look up a user by email.
    public User findByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password."));
    }
}