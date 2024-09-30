ARG AMAZON_LINUX_VERSION=2023

FROM public.ecr.aws/amazonlinux/amazonlinux:${AMAZON_LINUX_VERSION}
ARG AMAZON_LINUX_VERSION
ARG WORKDIR=/tmp/layer

HEALTHCHECK NONE

RUN dnf install -y jq dnf-plugins-core zip shadow-utils cpio \
    && dnf config-manager -y --add-repo "https://pkgs.tailscale.com/stable/amazon-linux/${AMAZON_LINUX_VERSION}/tailscale.repo" \
    && dnf update --downloadonly -y \
    && dnf clean all \
    && rm -rf /var/cache \
    && mkdir -p /tmp/layer/dist \
    && groupadd --gid 101 builder \
    && adduser builder --gid 101 --uid 101 --system --no-create-home

ENV IN_DOCKER="YES"

WORKDIR ${WORKDIR}
ENV WORKDIR=${WORKDIR}

COPY ./build.sh /bin
COPY ./resolve-packages.sh .
COPY ./tailscale.sh .

RUN chown -R builder:builder ${WORKDIR}

USER builder

ENTRYPOINT [ "/bin/build.sh" ]
