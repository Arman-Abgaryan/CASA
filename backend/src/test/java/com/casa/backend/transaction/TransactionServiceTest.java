package com.casa.backend.transaction;

import com.casa.backend.user.User;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TransactionServiceTest {

    @Mock
    private TransactionRepository repo;

    private TransactionService service;

    TransactionServiceTest() {
        MockitoAnnotations.openMocks(this);
        service = new TransactionService(repo);
    }

    @Test
    void saveTransaction_success() {
        Transaction t = new Transaction();
        when(repo.save(t)).thenReturn(t);

        Transaction result = service.saveTransaction(t);

        assertEquals(t, result);
        verify(repo, times(1)).save(t);
    }

    @Test
    void importCSV_success() throws Exception {
        String csv = "date,description,amount,category\n" +
                "2025-01-01,Starbucks,-4.75,Food\n" +
                "2025-01-02,Salary,3000.00,Income\n";

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream())
                .thenReturn(new ByteArrayInputStream(csv.getBytes()));

        User user = new User();

        when(repo.findByDateAndDescriptionAndAmountAndCategoryAndUser(
                any(LocalDate.class), anyString(), any(BigDecimal.class), anyString(), any(User.class)))
                .thenReturn(null);

        service.importCSV(mockFile, user);

        verify(repo, times(2)).save(any(Transaction.class));
    }

    @Test
    void importCSV_throwsException() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);

        when(mockFile.getInputStream())
                .thenThrow(new RuntimeException("bad file"));

        User user = new User();

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.importCSV(mockFile, user));

        assertTrue(ex.getMessage().contains("Error processing CSV"));
    }
}