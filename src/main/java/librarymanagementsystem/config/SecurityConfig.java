package librarymanagementsystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;
import librarymanagementsystem.dto.ErrorResponseDTO;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            ErrorResponseDTO error = ErrorResponseDTO.builder()
                    .status(HttpServletResponse.SC_FORBIDDEN)
                    .message("Access denied")
                    .timestamp(System.currentTimeMillis())
                    .build();
            objectMapper.writeValue(response.getWriter(), error);
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   RestAuthenticationEntryPoint entryPoint,
                                                   AccessDeniedHandler accessDeniedHandler) throws Exception {
        http
                // Same-origin simple app: CSRF tokens are not needed for this stage.
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        // Public pages and their assets
                        .requestMatchers("/login.html", "/register.html",
                                "/css/**", "/js/**", "/favicon.ico", "/error").permitAll()
                        // Public authentication endpoints
                        .requestMatchers("/auth/register", "/auth/login").permitAll()
                        // All borrowing endpoints require authentication (roles enforced in service)
                        .requestMatchers("/borrowings/**").authenticated()
                        // Book CRUD: GET for all authenticated, POST/PUT/DELETE for LIBRARIAN only
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/books").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/books/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/books").hasRole("LIBRARIAN")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/books/**").hasRole("LIBRARIAN")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/books/**").hasRole("LIBRARIAN")
                        // Everything else requires an authenticated session
                        .anyRequest().authenticated())

                // Unauthenticated requests -> JSON 401 for /auth/me, redirect otherwise
                // Authenticated but unauthorized -> JSON 403
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(accessDeniedHandler))

                // Logout is handled by our own /auth/logout endpoint
                .logout(logout -> logout.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }
}