package librarymanagementsystem.config;

import librarymanagementsystem.entity.Role;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the predefined LIBRARIAN account on application startup.
 * The password is hashed with BCrypt and never stored in plain text.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String email = "admin@booksphere.com";

        if (!userRepository.existsByEmail(email)) {
            userRepository.save(User.builder()
                    .name("Librarian Admin")
                    .email(email)
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.LIBRARIAN)
                    .build());
        }
    }
}