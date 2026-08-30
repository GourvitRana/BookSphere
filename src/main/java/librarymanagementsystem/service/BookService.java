package librarymanagementsystem.service;

import librarymanagementsystem.dto.BookRequestDTO;
import librarymanagementsystem.dto.BookResponseDTO;
import librarymanagementsystem.entity.Book;
import librarymanagementsystem.exception.BookHasBorrowingsException;
import librarymanagementsystem.exception.ResourceNotFoundException;
import librarymanagementsystem.repository.BookRepository;
import librarymanagementsystem.repository.BorrowingRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final BorrowingRepository borrowingRepository;

    public BookService(BookRepository bookRepository, BorrowingRepository borrowingRepository) {
        this.bookRepository = bookRepository;
        this.borrowingRepository = borrowingRepository;
    }

    // Add Book
    public BookResponseDTO addBook(BookRequestDTO requestDTO) {

        Book book = Book.builder()
                .title(requestDTO.getTitle())
                .author(requestDTO.getAuthor())
                .category(requestDTO.getCategory())
                .price(requestDTO.getPrice())
                .quantity(requestDTO.getQuantity())
                .build();

        Book savedBook = bookRepository.save(book);

        return mapToResponse(savedBook);
    }

    // Get All Books
    public List<BookResponseDTO> getAllBooks() {

        return bookRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Get Book By ID
    public BookResponseDTO getBookById(Long id) {

        Book book = bookRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Book not found with ID : " + id));

        return mapToResponse(book);
    }

    // Update Book
    public BookResponseDTO updateBook(Long id, BookRequestDTO requestDTO) {

        Book book = bookRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Book not found with ID : " + id));

        book.setTitle(requestDTO.getTitle());
        book.setAuthor(requestDTO.getAuthor());
        book.setCategory(requestDTO.getCategory());
        book.setPrice(requestDTO.getPrice());
        book.setQuantity(requestDTO.getQuantity());

        Book updatedBook = bookRepository.save(book);

        return mapToResponse(updatedBook);
    }

    // Delete Book
    public void deleteBook(Long id) {

        Book book = bookRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Book not found with ID : " + id));

        if (borrowingRepository.existsByBookId(id)) {
            throw new BookHasBorrowingsException(
                    "This book has borrowing records and cannot be deleted to preserve library history.");
        }

        bookRepository.delete(book);
    }

    // Convert Entity to Response DTO
    private BookResponseDTO mapToResponse(Book book) {

        return BookResponseDTO.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .category(book.getCategory())
                .price(book.getPrice())
                .quantity(book.getQuantity())
                .build();
    }
}