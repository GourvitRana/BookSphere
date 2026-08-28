package librarymanagementsystem.service;

import librarymanagementsystem.dto.BorrowRequestDTO;
import librarymanagementsystem.dto.BorrowResponseDTO;
import librarymanagementsystem.entity.Book;
import librarymanagementsystem.entity.Borrowing;
import librarymanagementsystem.entity.BorrowingStatus;
import librarymanagementsystem.entity.User;
import librarymanagementsystem.exception.BookNotAvailableException;
import librarymanagementsystem.exception.BorrowingAlreadyReturnedException;
import librarymanagementsystem.exception.BorrowingNotFoundException;
import librarymanagementsystem.exception.ResourceNotFoundException;
import librarymanagementsystem.exception.UnauthorizedBorrowingOperationException;
import librarymanagementsystem.repository.BookRepository;
import librarymanagementsystem.repository.BorrowingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BorrowingService {

    private final BorrowingRepository borrowingRepository;
    private final BookRepository bookRepository;

    public BorrowingService(BorrowingRepository borrowingRepository, BookRepository bookRepository) {
        this.borrowingRepository = borrowingRepository;
        this.bookRepository = bookRepository;
    }

    @Transactional
    public BorrowResponseDTO borrow(Long bookId, User currentUser) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with ID: " + bookId));

        if (book.getQuantity() <= 0) {
            throw new BookNotAvailableException("Book is not available for borrowing.");
        }

        boolean alreadyBorrowed = borrowingRepository
                .findByUserIdAndBookIdAndStatus(currentUser.getId(), bookId, BorrowingStatus.ACTIVE)
                .isPresent();

        if (alreadyBorrowed) {
            throw new BookNotAvailableException("You have already borrowed this book.");
        }

        book.setQuantity(book.getQuantity() - 1);
        bookRepository.save(book);

        Borrowing borrowing = Borrowing.builder()
                .user(currentUser)
                .book(book)
                .borrowedAt(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(14))
                .status(BorrowingStatus.ACTIVE)
                .build();

        Borrowing saved = borrowingRepository.save(borrowing);
        return mapToResponse(saved);
    }

    public List<BorrowResponseDTO> getMyBorrowings(User currentUser) {
        return borrowingRepository.findByUserId(currentUser.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BorrowResponseDTO> getAllBorrowings() {
        return borrowingRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BorrowResponseDTO> getActiveBorrowings() {
        return borrowingRepository.findByStatus(BorrowingStatus.ACTIVE)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BorrowResponseDTO returnBook(Long borrowingId, User currentUser, boolean isLibrarian) {
        Borrowing borrowing = borrowingRepository.findById(borrowingId)
                .orElseThrow(() -> new BorrowingNotFoundException("Borrowing not found with ID: " + borrowingId));

        if (!isLibrarian && !borrowing.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedBorrowingOperationException("You can only return your own borrowings.");
        }

        if (borrowing.getStatus() == BorrowingStatus.RETURNED) {
            throw new BorrowingAlreadyReturnedException("This book has already been returned.");
        }

        borrowing.setStatus(BorrowingStatus.RETURNED);
        borrowing.setReturnedAt(LocalDate.now());

        Book book = borrowing.getBook();
        book.setQuantity(book.getQuantity() + 1);
        bookRepository.save(book);

        Borrowing saved = borrowingRepository.save(borrowing);
        return mapToResponse(saved);
    }

    private BorrowResponseDTO mapToResponse(Borrowing borrowing) {
        return BorrowResponseDTO.builder()
                .id(borrowing.getId())
                .bookId(borrowing.getBook().getId())
                .bookTitle(borrowing.getBook().getTitle())
                .bookAuthor(borrowing.getBook().getAuthor())
                .borrowedAt(borrowing.getBorrowedAt())
                .dueDate(borrowing.getDueDate())
                .returnedAt(borrowing.getReturnedAt())
                .status(borrowing.getStatus())
                .build();
    }
}