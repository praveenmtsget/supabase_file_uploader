## Secure File Uploader with Supabase and GCP Backup

This project is a secure, user-authenticated web application for uploading PDF files. It leverages the Supabase platform for authentication and primary storage, and automatically backs up every uploaded file to a Google Cloud Platform (GCP) Cloud Storage bucket using a Supabase Edge Function triggered by a database webhook.

# Features

* User Authentication: Secure signup and login functionality powered by Supabase Auth.

* Private, Per-User Storage: Users can only upload, view, and manage their own files. Access is enforced by Supabase's Row Level Security (RLS).

* Secure File Access: Private files are accessed via temporary, signed URLs, not public links.

* Automatic GCP Backup: Every file uploaded to Supabase is instantly and automatically copied to a designated GCP Cloud Storage bucket via a serverless Edge Function.

+++++++++++++++++++++++++++++

Production-Ready: Includes instructions and configurations for deploying the static frontend to a Kubernetes cluster for public access.

Architecture Diagram
+-----------+       +-------------------+       +-----------------------+
|           |       |                   |       |                       |
|   User    +-----> |  Web Application  +-----> |    Supabase Project   |
| (Browser) |       | (Static Frontend) |       |                       |
+-----------+       +-------------------+       +-----------+-----------+
                                                            | (Upload)
                                                            v
                                                  +--------------------+
                                                  | Supabase Storage   |
                                                  | (user-submitted-docs)|
                                                  +--------------------+
                                                            | (Creates row in storage.objects)
                                                            v
                                                  +--------------------+
                                                  |  Database Trigger  |
                                                  | (on INSERT)        |
                                                  +--------------------+
                                                            | (Invokes Function)
                                                            v
                                                  +--------------------+
                                                  | Supabase Edge Fn.  |
                                                  | (copy-to-gcp)      |
                                                  +--------------------+
                                                            | (Downloads from Supabase,
                                                            |  Uploads to GCP)
                                                            v
                                                  +--------------------+
                                                  | GCP Cloud Storage  |
                                                  | (Backup Bucket)    |
                                                  +--------------------+

Prerequisites

Before you begin, you will need:

A Supabase account.

A Google Cloud Platform (GCP) account with billing enabled.

Node.js and npm installed locally.

Supabase CLI installed (npm install supabase --global).

Docker installed locally.

kubectl CLI installed locally.

Helm CLI installed locally.

1. Local Development Setup

Follow these steps to run the application on your local machine.

Step 1: Clone the Repository
git clone <your-repository-url>
cd <repository-name>
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
Step 2: Configure Supabase

Create a Supabase Project:

Go to supabase.com and create a new project.

Keep your Project URL, anon key, and service_role key handy.

Create a Storage Bucket:

In your project dashboard, go to Storage.

Create a new private bucket named user-submitted-docs.

Configure Authentication:

Go to Authentication -> Providers -> Email.

For easy testing, temporarily disable "Confirm email". Remember to re-enable it for production.

Link your local project to Supabase:

# Login to the Supabase CLI
supabase login

# Link your project (find your project ref in the dashboard URL)
supabase link --project-ref <your-project-ref>
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
Step 3: Configure GCP

Create a GCP Cloud Storage Bucket: Create a new bucket in GCP (e.g., my-supabase-backup-bucket).

Create a GCP Service Account:

In IAM & Admin -> Service Accounts, create a new service account.

Grant it the "Storage Object Admin" role.

Create a JSON key for this service account and download it.

Step 4: Set Up Local Environment

Set Supabase Secrets: Open the downloaded GCP JSON key. Use the Supabase CLI to securely store your GCP credentials.

supabase secrets set GCP_PROJECT_ID="your-gcp-project-id"
supabase secrets set GCP_CLIENT_EMAIL="your-gcp-service-account-email"
supabase secrets set GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-key...\n-----END PRIVATE KEY-----\n"
supabase secrets set GCP_BUCKET_NAME="your-gcp-bucket-name"
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

Note: Wrap the private key in double quotes to preserve newline characters.

Update Frontend Configuration:

Open the script.js file.

Replace the placeholder values for SUPABASE_URL and SUPABASE_ANON_KEY with your actual keys from the Supabase dashboard.

Step 5: Deploy Supabase Backend Logic

Deploy the Edge Function:

supabase functions deploy copy-to-gcp --no-verify-jwt
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

Deploy the Database Trigger:

Open the SQL file containing the trigger logic (e.g., supabase/migrations/trigger.sql).

Replace YOUR_PROJECT_REF and YOUR_SUPABASE_SERVICE_ROLE_KEY with your actual values.

Run the SQL file in the SQL Editor in your Supabase dashboard.

Step 6: Run the Web App Locally

The easiest way is to use the Live Server extension in Visual Studio Code.

Right-click index.html and select "Open with Live Server".

Your app should now be running locally, connected to your live Supabase backend.

2. Production Deployment (Kubernetes)

We will deploy the static frontend to a cost-effective managed Kubernetes cluster, such as DigitalOcean Kubernetes (DOKS), Civo, or Vultr. This guide uses DOKS as an example.

Step 1: Create a Kubernetes Cluster

Go to your chosen cloud provider's dashboard and create a new Kubernetes cluster.

A small, 2-node cluster with basic Droplets/VMs is sufficient and cost-effective.

Download the cluster's kubeconfig file and set up kubectl to connect to it.

Step 2: Build and Push a Docker Image

We will serve our static files using a lightweight NGINX web server inside a Docker container.

Create a Dockerfile in the root of your project:

# Use the official NGINX image as a base
FROM nginx:alpine

# Copy the static website files from the project to the NGINX web root directory
COPY . /usr/share/nginx/html

# Expose port 80 to allow traffic to the web server
EXPOSE 80

# The default NGINX command will start the server automatically
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Dockerfile
IGNORE_WHEN_COPYING_END

Build and push the image to a container registry (e.g., Docker Hub, GitHub Container Registry).

# Replace 'your-username' and 'your-imagename'
DOCKER_IMAGE="praveenmtsget/rkivedocs:beta-1"

# Build the image
docker build -t $DOCKER_IMAGE .

# Log in to your container registry (if needed)
docker login

# Push the image
docker push $DOCKER_IMAGE
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
Step 3: Install an Ingress Controller

An Ingress Controller is needed to expose your application to the public internet. We'll use the standard NGINX Ingress Controller.

# Add the ingress-nginx repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install the controller in its own namespace
helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
Step 4: Configure and Deploy to Kubernetes

Create a kubernetes directory in your project with the following manifest files.

kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-uploader-deployment
spec:
  replicas: 2 # Run two instances for availability
  selector:
    matchLabels:
      app: secure-uploader
  template:
    metadata:
      labels:
        app: secure-uploader
    spec:
      containers:
      - name: web
        # IMPORTANT: Replace with your Docker image from Step 2
        image: your-username/your-imagename:latest
        ports:
        - containerPort: 80
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Yaml
IGNORE_WHEN_COPYING_END
kubernetes/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: secure-uploader-service
spec:
  selector:
    app: secure-uploader
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Yaml
IGNORE_WHEN_COPYING_END
kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-uploader-ingress
  annotations:
    # Use the NGINX Ingress Controller
    kubernetes.io/ingress.class: "nginx"
    # Optional: For Let's Encrypt SSL, you'd add cert-manager annotations here
    # cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
  - host: "your-domain.com" # IMPORTANT: Replace with your public domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secure-uploader-service
            port:
              number: 80
  # Optional: TLS configuration for HTTPS
  # tls:
  # - hosts:
  #   - "your-domain.com"
  #   secretName: your-domain-tls-secret # Cert-manager creates this automatically
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Yaml
IGNORE_WHEN_COPYING_END
Step 5: Apply Manifests and Configure DNS

Apply the Kubernetes manifests:

kubectl apply -f kubernetes/
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

Find your Load Balancer's External IP:
The Ingress Controller creates a cloud Load Balancer to receive traffic. Find its IP address.

kubectl get service -n ingress-nginx ingress-nginx-controller
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

Look for the value in the EXTERNAL-IP column. It may take a few minutes to appear.

Configure your DNS:

Go to your domain name registrar (e.g., GoDaddy, Namecheap, Cloudflare).

Create an A record for your-domain.com that points to the EXTERNAL-IP you just found.

After a few minutes for DNS to propagate, your website will be live and publicly accessible at http://your-domain.com. For HTTPS, you would need to install cert-manager in your cluster and configure it.

License

This project is licensed under the MIT License.
