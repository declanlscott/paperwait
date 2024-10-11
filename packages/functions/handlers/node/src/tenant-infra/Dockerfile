ARG NODE_VERSION=20
FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION}

# Install pulumi
RUN dnf install -y tar gzip
RUN curl -fsSL https://get.pulumi.com | sh
RUN mv /root/.pulumi /opt/pulumi

# Add pulumi to PATH
ENV PATH="/opt/pulumi/bin:${PATH}"

# Create a pulumi home directory
RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

# Copy program to /var/task
COPY dist/index.js /var/task

CMD [ "index.handler" ]
