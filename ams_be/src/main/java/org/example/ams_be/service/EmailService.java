package org.example.ams_be.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String mailUsername;

    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            try {
                // From address MUST match the authenticated SMTP account (spring.mail.username)
                // Gmail rejects emails where From differs from the login account
                helper.setFrom(mailUsername, "HR Attendance System");
            } catch (UnsupportedEncodingException e) {
                throw new RuntimeException(e);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Cannot send email to: " + to, e);
        }
    }

    public void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Mã OTP đặt lại mật khẩu");
        message.setText(
                "Xin chào,\n\n" +
                        "Mã OTP đặt lại mật khẩu của bạn là: " + otp + "\n" +
                        "Mã này có hiệu lực trong 5 phút.\n\n" +
                        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này."
        );
        mailSender.send(message);
    }
}