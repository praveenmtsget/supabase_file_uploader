# Use the official NGINX image as a base
FROM nginx:alpine

# Copy the static website files from the project to the NGINX web root directory
COPY . /usr/share/nginx/html

# Expose port 80 to allow traffic to the web server
EXPOSE 80

# The default NGINX command will start the server automatically