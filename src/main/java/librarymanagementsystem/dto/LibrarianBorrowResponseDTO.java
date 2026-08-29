package librarymanagementsystem.dto;

import librarymanagementsystem.entity.BorrowingStatus;
import librarymanagementsystem.entity.Role;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LibrarianBorrowResponseDTO {

    private Long id;

    private Long userId;

    private String userName;

    private String userEmail;

    private Role userRole;

    private Long bookId;

    private String bookTitle;

    private String bookAuthor;

    private LocalDate borrowedAt;

    private LocalDate dueDate;

    private LocalDate returnedAt;

    private BorrowingStatus status;
}