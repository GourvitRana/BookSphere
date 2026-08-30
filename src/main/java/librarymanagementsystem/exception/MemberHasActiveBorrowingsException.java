package librarymanagementsystem.exception;

public class MemberHasActiveBorrowingsException extends RuntimeException {
    public MemberHasActiveBorrowingsException(String message) {
        super(message);
    }
}
