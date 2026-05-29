package com.document.management.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.S3Object;
import com.document.management.model.Document;
import com.document.management.model.ProcessingStatus;
import com.document.management.model.UploadStatus;
import com.document.management.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AmazonS3 amazonS3;
    private final BackgroundProcessor backgroundProcessor;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${aws.bucketName}")
    private String bucketName;

    public Document uploadDocument(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            originalFilename = "unnamed_document.pdf";
        }
        
        long fileSize = file.getSize();
        String contentType = file.getContentType();
        if (contentType == null) {
            contentType = "application/pdf";
        }

        // Generate a unique S3 Key
        String s3Key = "documents/" + UUID.randomUUID() + "_" + originalFilename;

        // Step 1: Save initial document state in DB as PENDING upload
        Document document = Document.builder()
                .name(originalFilename)
                .s3Key(s3Key)
                .s3Url("") // Will be filled after successful S3 upload
                .fileSize(fileSize)
                .contentType(contentType)
                .uploadStatus(UploadStatus.UPLOADING)
                .processingStatus(ProcessingStatus.PENDING)
                .build();

        document = documentRepository.save(document);
        log.info("Saved initial document record: {}", document.getId());

        try {
            // Check if bucket exists, create if not
            if (!amazonS3.doesBucketExistV2(bucketName)) {
                log.info("Creating AWS S3 Bucket: {}", bucketName);
                amazonS3.createBucket(bucketName);
            }

            // Step 2: Stream file to S3
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType(contentType);
            metadata.setContentLength(fileSize);

            log.info("Uploading file to S3. Key: {}", s3Key);
            amazonS3.putObject(bucketName, s3Key, file.getInputStream(), metadata);
            log.info("File uploaded successfully to S3: {}", s3Key);

            // Fetch S3 URL
            String s3Url = amazonS3.getUrl(bucketName, s3Key).toString();

            // Step 3: Update DB to completed upload and store state immediately (No OCR / Indexing)
            document.setUploadStatus(UploadStatus.COMPLETED);
            document.setProcessingStatus(ProcessingStatus.COMPLETED);
            document.setProcessedAt(java.time.LocalDateTime.now());
            document.setS3Url(s3Url);
            document = documentRepository.save(document);

            // Step 4: Save persistent upload success notification
            try {
                notificationService.createNotification("Document '" + document.getName() + "' successfully uploaded and securely stored.", "success");
            } catch (Exception ex) {
                log.error("Failed to create success notification", ex);
            }

            // Step 5: Broadcast immediately to WebSockets
            messagingTemplate.convertAndSend("/topic/documents", document);

            return document;

        } catch (Exception e) {
            log.error("Failed to upload document: {}", originalFilename, e);
            document.setUploadStatus(UploadStatus.FAILED);
            document.setProcessingStatus(ProcessingStatus.FAILED);
            documentRepository.save(document);
            
            // Log a failed upload notification to database
            try {
                notificationService.createNotification("Failed to upload document: " + originalFilename + " to cloud storage.", "failed");
            } catch (Exception ex) {
                log.error("Failed to create failed notification", ex);
            }
            
            throw new IOException("Failed to store file in cloud storage", e);
        }
    }

    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    public Document getDocumentById(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + id));
    }

    public S3Object downloadDocument(Long id) {
        Document document = getDocumentById(id);
        log.info("Downloading file from S3. Key: {}", document.getS3Key());
        return amazonS3.getObject(bucketName, document.getS3Key());
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document document = getDocumentById(id);
        
        // Delete from S3
        try {
            if (amazonS3.doesObjectExist(bucketName, document.getS3Key())) {
                log.info("Deleting file from S3: {}", document.getS3Key());
                amazonS3.deleteObject(bucketName, document.getS3Key());
            }
        } catch (Exception e) {
            log.error("Failed to delete S3 file: {}", document.getS3Key(), e);
        }

        // Delete from Database
        documentRepository.delete(document);
        log.info("Deleted document record from DB with ID: {}", id);
    }
}
