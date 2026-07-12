import logging
import sys

def configure_logging(environment: str) -> None:
    level = logging.INFO if environment.lower() == "production" else logging.DEBUG
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    # Silences verbose logs from third-party libraries that may include sensitive data.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


security_logger = logging.getLogger("security")