package com.document.management.service;

import com.document.management.model.Notification;
import com.document.management.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Notification createNotification(String message, String type) {
        log.info("Creating system notification: {} ({})", message, type);
        
        Notification notification = Notification.builder()
                .message(message)
                .type(type)
                .createdAt(LocalDateTime.now())
                .read(false)
                .build();

        notification = notificationRepository.save(notification);

        // Broadcast notification to WebSocket subscribers in real time
        messagingTemplate.convertAndSend("/topic/notifications", notification);
        
        return notification;
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Notification markAsRead(Long id) {
        log.info("Marking notification as read: {}", id);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));
        
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead() {
        log.info("Marking all notifications as read");
        notificationRepository.markAllAsRead();
    }
}
