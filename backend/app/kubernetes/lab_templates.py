"""
Per-lab-type Kubernetes resource templates.
Returns the manifest dict (image, env, labels, port) for each lab type.
"""
from dataclasses import dataclass
from app.db.models import LabType


@dataclass
class LabTemplate:
    image: str
    labels: dict
    env_vars: dict
    port: int
    description: str


LAB_TEMPLATES: dict[LabType, LabTemplate] = {
    LabType.LINUX: LabTemplate(
        image="ubuntu:22.04",
        labels={"app": "linux-lab", "managed-by": "cloudarena", "lab-type": "linux"},
        env_vars={"TERM": "xterm-256color"},
        port=22,
        description="Ubuntu 22.04 — practice Linux commands",
    ),
    LabType.GIT: LabTemplate(
        image="alpine/git:latest",
        labels={"app": "git-lab", "managed-by": "cloudarena", "lab-type": "git"},
        env_vars={"GIT_AUTHOR_NAME": "CloudArena", "GIT_AUTHOR_EMAIL": "lab@cloudarena.io"},
        port=22,
        description="Alpine + Git — practice Git workflows",
    ),
    LabType.DOCKER: LabTemplate(
        image="docker:24-dind",
        labels={"app": "docker-lab", "managed-by": "cloudarena", "lab-type": "docker"},
        env_vars={"DOCKER_TLS_CERTDIR": ""},
        port=2375,
        description="Docker-in-Docker — practice container operations",
    ),
}


def get_template(lab_type: LabType) -> LabTemplate:
    return LAB_TEMPLATES[lab_type]


def build_resource_names(user_id: int, lab_type: LabType, lab_id: int) -> dict[str, str]:
    """Build deterministic K8s resource names from user/lab identifiers."""
    prefix = f"user-{user_id}-{lab_type.value}-{lab_id}"
    return {
        "namespace": f"ca-{prefix}",
        "deployment": f"{lab_type.value}-lab-{prefix}",
        "service": f"{lab_type.value}-svc-{prefix}",
    }
