package com.document.management.controller;

import com.amazonaws.services.s3.model.S3Object;
import com.document.management.model.Document;
import com.document.management.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<Document> uploadDocument(@RequestParam("file") MultipartFile file) {
        log.info("Received request to upload file: {}", file.getOriginalFilename());
        
        // Basic validation: must be PDF or at least a file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Document document = documentService.uploadDocument(file);
            return ResponseEntity.ok(document);
        } catch (IOException e) {
            log.error("Error processing file upload", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Document>> getAllDocuments() {
        log.info("Fetching list of all documents");
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long id,
            @RequestParam(value = "inline", defaultValue = "false") boolean inline) {
        try {
            Document doc = documentService.getDocumentById(id);
            S3Object s3Object = documentService.downloadDocument(id);
            InputStreamResource resource = new InputStreamResource(s3Object.getObjectContent());

            String disposition = inline ? "inline" : "attachment";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + doc.getName() + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, doc.getContentType())
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(doc.getFileSize()))
                    .body(resource);
        } catch (Exception e) {
            log.error("Error downloading/viewing document with ID: {}", id, e);
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        log.info("Received request to delete document: {}", id);
        try {
            documentService.deleteDocument(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.error("Document not found for delete", e);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error deleting document with ID: {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
