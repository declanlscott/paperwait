ARG AMAZON_LINUX_VERSION=2

FROM public.ecr.aws/amazonlinux/amazonlinux:${AMAZON_LINUX_VERSION}
ARG AMAZON_LINUX_VERSION
ARG WORKDIR=/tmp/layer

ARG USER_GID
ARG USER_UID

HEALTHCHECK NONE

RUN yum install -y jq yum-utils zip shadow-utils \
    && yum-config-manager -y --add-repo "https://pkgs.tailscale.com/stable/amazon-linux/${AMAZON_LINUX_VERSION}/tailscale.repo" \
    && yum update gnupg2 -y \
    && yum update --downloadonly -y \
    && yum clean all \
    && rm -rf /var/cache \
    && mkdir -p /tmp/layer/dist \
    && groupadd --gid 1000 builder \
    && adduser builder --gid 1000 --uid 1000 --system --no-create-home

ENV IN_DOCKER="YES"

WORKDIR ${WORKDIR}
ENV WORKDIR=${WORKDIR}

COPY ./build.sh /bin
COPY ./determine-dependency-locations.sh .
COPY ./extension.sh .

RUN chown -R builder:builder ${WORKDIR}

USER builder

ENTRYPOINT [ "/bin/build.sh" ]
