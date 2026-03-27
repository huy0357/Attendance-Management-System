FROM rasa/rasa-sdk:3.6.2

WORKDIR /app

# Copy the requirements file
COPY requirements.txt ./

# Switch to root to install python dependencies
USER root

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Switch back to non-root user for security
USER 1001

# The start command is inherited from the base image but we can specify it
CMD ["start", "--actions", "actions"]
