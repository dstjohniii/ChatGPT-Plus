# Use an official Node.js image as the base image
FROM node:20-bullseye-slim

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose port 3000
EXPOSE 3000

# Command to run Vite in development mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
