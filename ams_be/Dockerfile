FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
RUN mkdir -p uploads/avatars
ENTRYPOINT ["java", "-Xms256m", "-Xmx768m", "-jar", "app.jar"]