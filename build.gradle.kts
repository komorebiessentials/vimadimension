import org.springframework.boot.gradle.tasks.run.BootRun

plugins {
    id("java")
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "org.example"
version = "1.0-SNAPSHOT"


// Use Java 21 LTS for Windows Server 2016 compatibility
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")

    // For Spring Data JPA
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security") // <-- ADD THIS LINE
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    // You'll also need a JDBC driver for your chosen database.
    // For example, if you're using PostgreSQL:
    // runtimeOnly("org.postgresql:postgresql")

    // Or for H2 (often used for development/testing):
    // runtimeOnly("com.h2database:h2")

    // Or for MySQL:
    runtimeOnly("com.mysql:mysql-connector-j")
    
    // Apache POI for Excel export
    implementation("org.apache.poi:poi:5.2.4")
    implementation("org.apache.poi:poi-ooxml:5.2.4")
    
    // iText for PDF generation
    implementation("com.itextpdf:itext7-core:7.2.5")
    implementation("com.itextpdf:html2pdf:4.0.5")
}

tasks.test {
    useJUnitPlatform()
}

tasks.withType<BootRun>().configureEach {
    // Ensure local runs have enough heap for heavier workloads
    jvmArgs("-Xms1g", "-Xmx2g")
}
