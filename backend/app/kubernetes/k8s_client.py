"""
Kubernetes client wrapper.
Supports both in-cluster (production) and kubeconfig (local dev) modes.
"""
import logging
from typing import Optional

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from app.core.config import settings

logger = logging.getLogger(__name__)


def _load_k8s_config() -> None:
    if settings.K8S_IN_CLUSTER:
        config.load_incluster_config()
    else:
        import os
        kubeconfig = os.path.expanduser(settings.K8S_KUBECONFIG_PATH)
        config.load_kube_config(config_file=kubeconfig)


class KubernetesClient:
    def __init__(self):
        try:
            _load_k8s_config()
            self._core = client.CoreV1Api()
            self._apps = client.AppsV1Api()
            self._connected = True
            logger.info("Kubernetes client initialized successfully")
        except Exception as exc:
            logger.warning(f"Kubernetes unavailable (running in mock mode): {exc}")
            self._connected = False

    # ── Namespace ──────────────────────────────────────────────────────────────

    async def create_namespace(self, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_namespace: {name}")
            return True
        ns = client.V1Namespace(metadata=client.V1ObjectMeta(
            name=name,
            labels={"managed-by": "cloudarena"},
        ))
        try:
            self._core.create_namespace(body=ns)
            logger.info(f"Namespace created: {name}")
            return True
        except ApiException as e:
            if e.status == 409:
                logger.warning(f"Namespace already exists: {name}")
                return True
            logger.error(f"Failed to create namespace {name}: {e}")
            return False

    async def delete_namespace(self, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_namespace: {name}")
            return True
        try:
            self._core.delete_namespace(name=name)
            logger.info(f"Namespace deleted: {name}")
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete namespace {name}: {e}")
            return False

    # ── Deployment ─────────────────────────────────────────────────────────────

    async def create_deployment(
        self,
        namespace: str,
        name: str,
        image: str,
        labels: dict,
        env_vars: Optional[dict] = None,
    ) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_deployment: {name} in {namespace}")
            return True
        env = [client.V1EnvVar(name=k, value=v) for k, v in (env_vars or {}).items()]
        container = client.V1Container(
            name=name,
            image=image,
            env=env,
            resources=client.V1ResourceRequirements(
                requests={"cpu": "100m", "memory": "128Mi"},
                limits={"cpu": "500m", "memory": "512Mi"},
            ),
        )
        spec = client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels=labels),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels=labels),
                spec=client.V1PodSpec(containers=[container]),
            ),
        )
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(name=name, namespace=namespace, labels=labels),
            spec=spec,
        )
        try:
            self._apps.create_namespaced_deployment(namespace=namespace, body=deployment)
            logger.info(f"Deployment created: {name} in {namespace}")
            return True
        except ApiException as e:
            logger.error(f"Failed to create deployment {name}: {e}")
            return False

    async def delete_deployment(self, namespace: str, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_deployment: {name}")
            return True
        try:
            self._apps.delete_namespaced_deployment(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete deployment {name}: {e}")
            return False

    # ── Service ────────────────────────────────────────────────────────────────

    async def create_service(
        self,
        namespace: str,
        name: str,
        selector: dict,
        port: int = 80,
    ) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_service: {name} in {namespace}")
            return True
        svc = client.V1Service(
            metadata=client.V1ObjectMeta(name=name, namespace=namespace),
            spec=client.V1ServiceSpec(
                selector=selector,
                ports=[client.V1ServicePort(port=port, target_port=port)],
                type="ClusterIP",
            ),
        )
        try:
            self._core.create_namespaced_service(namespace=namespace, body=svc)
            logger.info(f"Service created: {name} in {namespace}")
            return True
        except ApiException as e:
            if e.status == 409:
                return True
            logger.error(f"Failed to create service {name}: {e}")
            return False

    async def delete_service(self, namespace: str, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_service: {name}")
            return True
        try:
            self._core.delete_namespaced_service(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete service {name}: {e}")
            return False


# Singleton instance
k8s_client = KubernetesClient()
