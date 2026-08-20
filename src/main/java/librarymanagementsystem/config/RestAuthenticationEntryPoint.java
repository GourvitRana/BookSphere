package librarymanagementsystem.config;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import librarymanagementsystem.dto.ErrorResponseDTO;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Decides what happens when an unauthenticated user tries to access a
 * protected endpoint.
 * - /auth/me returns a JSON 401 so the frontend can react to it.
 * - every other protected page is redirected to the login page.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        if ("/auth/me".equals(request.getRequestURI())) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            ErrorResponseDTO error = ErrorResponseDTO.builder()
                    .status(HttpServletResponse.SC_UNAUTHORIZED)
                    .message("Not authenticated")
                    .timestamp(System.currentTimeMillis())
                    .build();
            objectMapper.writeValue(response.getWriter(), error);
        } else {
            response.sendRedirect("/login.html");
        }
    }
}