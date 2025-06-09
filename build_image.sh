# version based on git commit hash
#!/bin/bash
set -e
# This script builds a Docker image for the rkivedocs project and pushes it to a container registry.
# Ensure you have Docker installed and running before executing this script.
# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi
# git commit hash
GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
# Check if the git command was successful
if [ $? -ne 0 ]; then
    echo "Failed to retrieve git commit hash. Make sure you are in a git repository."
    exit 1
fi  
# Replace 'your-username' and 'your-imagename'
DOCKER_IMAGE="praveenmtsget/rkivedocs:beta-$GIT_COMMIT_HASH"

# Build the image
docker build -t $DOCKER_IMAGE .

# Add a tag for the latest version
docker tag $DOCKER_IMAGE praveenmtsget/rkivedocs:latest
# Optionally, you can also tag it with the 'beta' tag
docker tag $DOCKER_IMAGE praveenmtsget/rkivedocs:beta

# Log in to your container registry (if needed)
#docker login

# Push the image
docker push $DOCKER_IMAGE