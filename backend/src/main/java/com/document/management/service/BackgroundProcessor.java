package com.document.management.service;

import com.document.management.model.Document;
import com.document.management.model.ProcessingStatus;
import com.document.management.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class BackgroundProcessor {

    private final DocumentRepository documentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Async
    public void processDocument(Long documentId) {
        log.info("Starting background processing for document ID: {}", documentId);
        
        try {
            // Retrieve fresh managed entity from database inside new thread context
            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

            // Step 1: Transition status to PROCESSING
            document.setProcessingStatus(ProcessingStatus.PROCESSING);
            document = documentRepository.save(document);
            
            // Notify frontend
            messagingTemplate.convertAndSend("/topic/documents", document);
            
            // Step 2: Simulate document analysis / OCR / Security scanning
            // We'll sleep for 4 seconds to make the UI progress clearly visible
            Thread.sleep(4000);
            
            // Fetch fresh state again in case of concurrent changes
            document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

            // Step 3: Complete processing
            document.setProcessingStatus(ProcessingStatus.COMPLETED);
            document.setProcessedAt(LocalDateTime.now());
            document = documentRepository.save(document);
            
            log.info("Finished background processing for document: {}", document.getName());
            
            // Notify frontend of success
            messagingTemplate.convertAndSend("/topic/documents", document);
            
        } catch (InterruptedException e) {
            log.error("Document processing interrupted for ID: {}", documentId, e);
            try {
                Document document = documentRepository.findById(documentId).orElse(null);
                if (document != null) {
                    document.setProcessingStatus(ProcessingStatus.FAILED);
                    document = documentRepository.save(document);
                    messagingTemplate.convertAndSend("/topic/documents", document);
                }
            } catch (Exception ex) {
                log.error("Failed to save failed status", ex);
            }
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Error processing document with ID: {}", documentId, e);
            try {
                Document document = documentRepository.findById(documentId).orElse(null);
                if (document != null) {
                    document.setProcessingStatus(ProcessingStatus.FAILED);
                    document = documentRepository.save(document);
                    messagingTemplate.convertAndSend("/topic/documents", document);
                }
            } catch (Exception ex) {
                log.error("Failed to save failed status", ex);
            }
        }
    }
}
