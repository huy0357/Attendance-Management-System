# =========================
# Stage 1: Build
# =========================
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app

# Copy toàn bộ project
COPY . .

# Build bằng Maven Wrapper
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# =========================
# Stage 2: Runtime
# =========================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

RUN mkdir -p uploads/avatars

EXPOSE 8080

ENTRYPOINT ["java", "-Xms256m", "-Xmx768m", "-jar", "app.jar"]