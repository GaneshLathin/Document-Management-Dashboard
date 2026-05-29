package com.document.management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DocumentManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(DocumentManagementApplication.class, args);
    }
}
