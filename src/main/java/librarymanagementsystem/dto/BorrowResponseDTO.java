package librarymanagementsystem.dto;

import librarymanagementsystem.entity.BorrowingStatus;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BorrowResponseDTO {

    private Long id;

    private Long bookId;

    private String bookTitle;

    private String bookAuthor;

    private LocalDate borrowedAt;

    private LocalDate dueDate;

    private LocalDate returnedAt;

    private BorrowingStatus status;
}