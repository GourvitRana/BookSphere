package librarymanagementsystem.service;

import librarymanagementsystem.dto.UserResponseDTO;
import librarymanagementsystem.entity.Borrowing;
import librarymanagementsystem.entity.BorrowingStatus;
import librarymanagementsystem.entity.Role;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.exception.LibrarianDeactivationException;
import librarymanagementsystem.exception.MemberHasActiveBorrowingsException;
import librarymanagementsystem.exception.MemberHasHistoryException;
import librarymanagementsystem.exception.ResourceNotFoundException;
import librarymanagementsystem.repository.BorrowingRepository;
import librarymanagementsystem.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BorrowingRepository borrowingRepository;

    public UserService(UserRepository userRepository, BorrowingRepository borrowingRepository) {
        this.userRepository = userRepository;
        this.borrowingRepository = borrowingRepository;
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

    public UserResponseDTO setActive(Long id, boolean active) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        if (user.getRole() == Role.LIBRARIAN) {
            throw new LibrarianDeactivationException("Librarian accounts cannot be deactivated.");
        }

        if (!active) {
            long activeBorrowings = borrowingRepository.findByUserId(user.getId())
                    .stream()
                    .filter(b -> b.getStatus() == BorrowingStatus.ACTIVE)
                    .count();
            if (activeBorrowings > 0) {
                throw new MemberHasActiveBorrowingsException(
                        "Member has active borrowings and cannot be deactivated until all books are returned.");
            }
        }

        user.setActive(active);
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with ID: " + id));

        if (user.getRole() == Role.LIBRARIAN) {
            throw new LibrarianDeactivationException("Librarian accounts cannot be deleted.");
        }

        // Active or overdue borrowings block permanent deletion
        long activeCount = borrowingRepository.findByUserId(user.getId())
                .stream()
                .filter(b -> b.getStatus() == BorrowingStatus.ACTIVE || b.getStatus() == BorrowingStatus.OVERDUE)
                .count();
        if (activeCount > 0) {
            throw new MemberHasActiveBorrowingsException(
                    "This member cannot be deleted while they have active borrowings. Return all borrowed books first.");
        }

        // Any borrowing history blocks deletion (preserve library history)
        if (borrowingRepository.countByUserId(user.getId()) > 0) {
            throw new MemberHasHistoryException(
                    "This member cannot be deleted because borrowing history exists. Deactivate the account instead.");
        }

        userRepository.delete(user);
    }

    private UserResponseDTO mapToResponse(User user) {
        List<Borrowing> borrowings = borrowingRepository.findByUserId(user.getId());
        long total = borrowings.size();
        long current = borrowings.stream()
                .filter(b -> b.getStatus() == BorrowingStatus.ACTIVE)
                .count();

        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.getActive() == null || user.getActive())
                .currentBorrowings(current)
                .totalBorrowings(total)
                .build();
    }
}