# Use the official NGINX image as a base
FROM nginx:alpine

# Copy the static website files to a temporary staging directory
COPY . /app

# The web root /usr/share/nginx/html will be populated by an initContainer at runtime.
# This just ensures the directory exists with the correct permissions.
RUN mkdir -p /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

RUN cp -R /app/* /usr/share/nginx/html

# Expose port 80
EXPOSE 80
