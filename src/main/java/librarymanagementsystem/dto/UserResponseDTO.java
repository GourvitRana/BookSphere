package librarymanagementsystem.dto;

import librarymanagementsystem.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDTO {

    private Long id;

    private String name;

    private String email;

    private Role role;

    private Boolean active;

    private Long currentBorrowings;

    private Long totalBorrowings;
}