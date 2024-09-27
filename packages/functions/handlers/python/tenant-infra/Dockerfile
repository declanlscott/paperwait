ARG PYTHON_VERSION=3.12
FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

ARG PYPROJECT_PATH
ARG UV_LOCK_PATH

COPY . ${LAMBDA_TASK_ROOT}

RUN dnf install -y tar
RUN curl -fsSL https://get.pulumi.com | sh
RUN mv /root/.pulumi /opt/pulumi

ENV PATH="/opt/pulumi/bin:${PATH}"

RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

RUN PYPROJECT_DIR=$(for dir in $(ls -R ${LAMBDA_TASK_ROOT} | grep ":$" | sed 's/:$//'); do if [ -f "${dir}/pyproject.toml" ]; then echo "${dir}"; break; fi; done) && \
    if [ -n "$PYPROJECT_DIR" ]; then \
    cd "$PYPROJECT_DIR" && uv export && pip install -t ${LAMBDA_TASK_ROOT} .; \
    else \
    echo "pyproject.toml not found"; \
    fi
