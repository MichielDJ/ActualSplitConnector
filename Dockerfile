# Use an official Node.js image as the base image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Install cron
RUN apt-get update && apt-get install -y cron

# Add the cron job to run the script at the specified interval
RUN echo "0 * * * * /usr/local/bin/node /usr/src/app/src/index.js >> /usr/src/app/cron.log 2>&1" > /etc/cron.d/sync-expenses-cron

# Give the cron job the right permissions
RUN chmod 0644 /etc/cron.d/sync-expenses-cron

# Apply cron job
RUN crontab /etc/cron.d/sync-expenses-cron

# Create the cron log file
RUN touch /usr/src/app/cron.log

# Create a directory for persistent data (optional)
RUN mkdir -p /usr/src/app/data

# Command to start cron in the background and keep the container running
CMD ["cron", "-f"]


# docker compose down
# docker compose build --no-cache
# docker compose up
# npm rebuild better-sqlite3