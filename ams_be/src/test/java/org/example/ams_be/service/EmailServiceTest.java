package org.example.ams_be.service;

import jakarta.mail.Address;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "mailUsername", "noreply@company.com");
    }

    @Test
    void sendHtmlEmailBuildsAndSendsMimeMessage() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendHtmlEmail("alice@company.com", "Subject", "<b>Hello</b>");

        verify(mailSender).send(mimeMessage);
        assertEquals("Subject", mimeMessage.getSubject());
        Address[] recipients = mimeMessage.getRecipients(Message.RecipientType.TO);
        assertEquals("alice@company.com", ((InternetAddress) recipients[0]).getAddress());
    }

    @Test
    void sendHtmlEmailThrowsRuntimeExceptionWhenMailSenderSendFails() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new org.springframework.mail.MailSendException("boom")).when(mailSender).send(mimeMessage);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> emailService.sendHtmlEmail("alice@company.com", "Subject", "<b>Hello</b>"));

        assertEquals("boom", ex.getMessage());
    }

    @Test
    void sendHtmlEmailWrapsMessagingExceptionFromInvalidRecipient() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> emailService.sendHtmlEmail("bad\nmail", "Subject", "<b>Hello</b>"));

        assertEquals("Cannot send email to: bad\nmail", ex.getMessage());
    }
}
