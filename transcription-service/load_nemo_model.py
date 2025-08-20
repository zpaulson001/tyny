#!/usr/bin/env python3
"""
Standalone script to load the NeMo ASR model (nvidia/parakeet-tdt-0.6b-v2).
This script can be used to test model loading and verify the environment setup.
"""

import logging
import sys
import time
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("nemo_model_loading.log"),
    ],
)

logger = logging.getLogger(__name__)


def load_nemo_model(model_name="nvidia/parakeet-tdt-0.6b-v2"):
    """
    Load the NeMo ASR model with error handling and timing.

    Args:
        model_name (str): The name of the model to load

    Returns:
        The loaded ASR model or None if loading fails
    """
    try:
        logger.info(f"Starting to load NeMo ASR model: {model_name}")
        start_time = time.time()

        # Import NeMo ASR
        import nemo.collections.asr as nemo_asr

        logger.info("Successfully imported nemo.collections.asr")

        # Load the model
        logger.info("Loading model from pretrained...")
        model = nemo_asr.models.ASRModel.from_pretrained(model_name=model_name)

        end_time = time.time()
        loading_time = end_time - start_time

        logger.info(f"Model loaded successfully in {loading_time:.2f} seconds!")
        logger.info(f"Model type: {type(model)}")

        return model

    except ImportError as e:
        logger.error(f"Failed to import NeMo ASR: {e}")
        logger.error(
            "Make sure nemo-toolkit[asr] is installed: pip install nemo-toolkit[asr]"
        )
        return None

    except Exception as e:
        logger.error(f"Error loading model: {e}")
        logger.error(f"Model name: {model_name}")
        return None


def main():
    """Main function to run the model loading script."""
    logger.info("=" * 60)
    logger.info("NeMo ASR Model Loading Script")
    logger.info("=" * 60)

    # Check Python version
    logger.info(f"Python version: {sys.version}")

    # Check if CUDA is available (optional)
    try:
        import torch

        if torch.cuda.is_available():
            logger.info(f"CUDA is available. GPU count: {torch.cuda.device_count()}")
            logger.info(f"Current device: {torch.cuda.current_device()}")
            logger.info(f"Device name: {torch.cuda.get_device_name()}")
        else:
            logger.warning("CUDA is not available. Model will run on CPU.")
    except ImportError:
        logger.warning("PyTorch not available. Cannot check CUDA status.")

    # Load the model
    model = load_nemo_model()

    if model is not None:
        logger.info("Model loading completed successfully!")
        logger.info("You can now use this model for speech recognition tasks.")

        # Optional: Test model with a simple operation
        try:
            # Get model info
            logger.info(f"Model device: {next(model.parameters()).device}")
            logger.info(
                f"Model parameters: {sum(p.numel() for p in model.parameters()):,}"
            )
        except Exception as e:
            logger.warning(f"Could not get model details: {e}")
    else:
        logger.error("Model loading failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
