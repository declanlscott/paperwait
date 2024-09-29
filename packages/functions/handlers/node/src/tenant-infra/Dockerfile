ARG NODE_VERSION=20
FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION}

RUN dnf install -y tar gzip
RUN curl -fsSL https://get.pulumi.com | sh
RUN mv /root/.pulumi /opt/pulumi

ENV PATH="/opt/pulumi/bin:${PATH}"

RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

WORKDIR /var/task
