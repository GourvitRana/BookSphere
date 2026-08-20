package librarymanagementsystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   RestAuthenticationEntryPoint entryPoint) throws Exception {
        http
                // Same-origin simple app: CSRF tokens are not needed for this stage.
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        // Public pages and their assets
                        .requestMatchers("/login.html", "/register.html",
                                "/css/**", "/js/**", "/favicon.ico", "/error").permitAll()
                        // Public authentication endpoints
                        .requestMatchers("/auth/register", "/auth/login").permitAll()
                        // Everything else requires an authenticated session
                        .anyRequest().authenticated())

                // Unauthenticated requests -> JSON 401 for /auth/me, redirect otherwise
                .exceptionHandling(ex -> ex.authenticationEntryPoint(entryPoint))

                // Logout is handled by our own /auth/logout endpoint
                .logout(logout -> logout.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }
}