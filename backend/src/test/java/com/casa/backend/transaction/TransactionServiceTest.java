package com.casa.backend.transaction;

import com.casa.backend.budget.BudgetRepository;
import com.casa.backend.email.EmailService;
import com.casa.backend.user.User;
import com.casa.backend.user.UserPreferencesService;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TransactionServiceTest {

    @Mock
    private TransactionRepository repo;

    @Mock
    private GeminiCsvParserService geminiParser;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private UserPreferencesService preferencesService;

    @Mock
    private EmailService emailService;

    private TransactionService service;

    TransactionServiceTest() {
        MockitoAnnotations.openMocks(this);
        service = new TransactionService(repo, geminiParser, budgetRepository, preferencesService, emailService);
        // Defaults so the budget-threshold check inside saveTransaction is a
        // no-op and doesn't interfere with the assertions in each test.
        when(budgetRepository.findAllByUser(any())).thenReturn(List.of());
        when(preferencesService.getOrCreate(any())).thenReturn(new com.casa.backend.user.UserPreferences());
    }

    @Test
    void saveTransaction_defaultsBankNameToManual() {
        Transaction t = new Transaction();
        when(repo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = service.saveTransaction(t);

        assertEquals("Manual", result.getBankName());
        verify(repo, times(1)).save(t);
    }

    @Test
    void saveTransaction_keepsExistingBankName() {
        Transaction t = Transaction.builder().bankName("Chase").build();
        when(repo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = service.saveTransaction(t);

        assertEquals("Chase", result.getBankName());
    }

    @Test
    void importCSV_savesEachParsedRowOnce() throws Exception {
        String csv = "anything,gemini parses it";
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new ByteArrayInputStream(csv.getBytes()));

        // Gemini returns two rows + a detected bank.
        when(geminiParser.parse(anyString())).thenReturn(new GeminiCsvParserService.ParsedCsv(
                "Chase",
                List.of(
                        new GeminiCsvParserService.ParsedRow("2025-01-01", "Starbucks", "-4.75", "Food"),
                        new GeminiCsvParserService.ParsedRow("2025-01-02", "Salary", "3000.00", "Paycheck")
                )));

        when(repo.findByDateAndDescriptionAndAmountAndCategoryAndBankNameAndUser(
                any(LocalDate.class), anyString(), any(BigDecimal.class), anyString(), anyString(), any(User.class)))
                .thenReturn(null);

        User user = new User();
        Map<String, Object> result = service.importCSV(mockFile, user);

        assertEquals("Chase", result.get("bankName"));
        verify(repo, times(2)).save(any(Transaction.class));
    }

    @Test
    void importCSV_skipsDuplicates() throws Exception {
        String csv = "anything";
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new ByteArrayInputStream(csv.getBytes()));

        when(geminiParser.parse(anyString())).thenReturn(new GeminiCsvParserService.ParsedCsv(
                "Citibank",
                List.of(new GeminiCsvParserService.ParsedRow("2025-01-01", "Starbucks", "-4.75", "Food"))));

        // Existing match found → row should NOT be saved.
        when(repo.findByDateAndDescriptionAndAmountAndCategoryAndBankNameAndUser(
                any(LocalDate.class), anyString(), any(BigDecimal.class), anyString(), anyString(), any(User.class)))
                .thenReturn(new Transaction());

        service.importCSV(mockFile, new User());

        verify(repo, never()).save(any(Transaction.class));
    }

    @Test
    void previewCSV_doesNotPersist() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new ByteArrayInputStream("x".getBytes()));

        when(geminiParser.parse(anyString())).thenReturn(new GeminiCsvParserService.ParsedCsv(
                "Bank of America",
                List.of(new GeminiCsvParserService.ParsedRow("2025-01-01", "Starbucks", "-4.75", "Food"))));

        Map<String, Object> result = service.previewCSV(mockFile);

        assertEquals("Bank of America", result.get("bankName"));
        verify(repo, never()).save(any(Transaction.class));
    }

    @Test
    void importCSV_throwsWhenFileUnreadable() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenThrow(new RuntimeException("bad file"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.importCSV(mockFile, new User()));

        assertTrue(ex.getMessage().contains("Error processing CSV"));
    }

    @Test
    void importCSV_collectsErrorsForUnparseableRows() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new ByteArrayInputStream("x".getBytes()));

        // One bad date, one bad amount, one good row.
        when(geminiParser.parse(anyString())).thenReturn(new GeminiCsvParserService.ParsedCsv(
                "Wells Fargo",
                List.of(
                        new GeminiCsvParserService.ParsedRow("not-a-date", "X", "1.00", "Food"),
                        new GeminiCsvParserService.ParsedRow("2025-01-01", "Y", "abc", "Food"),
                        new GeminiCsvParserService.ParsedRow("2025-01-02", "Z", "1.00", "Food")
                )));
        when(repo.findByDateAndDescriptionAndAmountAndCategoryAndBankNameAndUser(
                any(), any(), any(), any(), any(), any())).thenReturn(null);

        Map<String, Object> result = service.importCSV(mockFile, new User());

        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertEquals(2, errors.size());
        verify(repo, times(1)).save(any(Transaction.class));
    }
}
