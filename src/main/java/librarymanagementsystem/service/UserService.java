package librarymanagementsystem.service;

import librarymanagementsystem.dto.UserResponseDTO;
import librarymanagementsystem.entity.Role;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.exception.ResourceNotFoundException;
import librarymanagementsystem.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponseDTO> getAllMembers() {
        return userRepository.findByRoleNot(Role.LIBRARIAN)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public UserResponseDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return mapToResponse(user);
    }

    private UserResponseDTO mapToResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}