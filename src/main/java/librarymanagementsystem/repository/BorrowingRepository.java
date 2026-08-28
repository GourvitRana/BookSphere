package librarymanagementsystem.repository;

import librarymanagementsystem.entity.Borrowing;
import librarymanagementsystem.entity.BorrowingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BorrowingRepository extends JpaRepository<Borrowing, Long> {

    List<Borrowing> findByUserId(Long userId);

    List<Borrowing> findByUserIdAndStatus(Long userId, BorrowingStatus status);

    Optional<Borrowing> findByUserIdAndBookIdAndStatus(Long userId, Long bookId, BorrowingStatus status);

    List<Borrowing> findByStatus(BorrowingStatus status);
}