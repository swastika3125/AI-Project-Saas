try:
    from celery import Celery
    from app.core.config import settings

    celery_app = Celery(
        "pr_risk_worker",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.worker.tasks"]
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
    )
except ImportError:
    # Graceful fallback when celery is not installed in lightweight dev mode
    class DummyCelery:
        def task(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator

    celery_app = DummyCelery()
