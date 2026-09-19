"""
Pure-function baseline forecasting. Used two ways:
  1. As the fallback when there isn't enough pooled data yet to trust the
     trained model at all.
  2. As the cold-start component blended with the trained model's output —
     see blend_with_store_history().
"""
from typing import Optional


def moving_average_baseline(
    rolling_avg_4w: Optional[float], rolling_avg_8w: Optional[float]
) -> float:
    """Weighted moving average favoring the shorter (more responsive) window
    over the longer (more stable) one."""
    if rolling_avg_4w is None and rolling_avg_8w is None:
        return 0.0
    if rolling_avg_4w is None:
        return float(rolling_avg_8w)
    if rolling_avg_8w is None:
        return float(rolling_avg_4w)
    return 0.65 * float(rolling_avg_4w) + 0.35 * float(rolling_avg_8w)


def blend_with_store_history(
    store_specific_prediction: float,
    category_avg_prediction: float,
    weeks_of_store_data: int,
    full_weeks: int = 8,
) -> float:
    """
    Cold-start blending: a brand-new store leans almost entirely on the
    category-level average; as its own history accumulates toward
    `full_weeks`, its own product/store-specific prediction takes over.

    This is a continuous function of actual data volume, not a hardcoded
    "new stores get X% off" rule.
    """
    store_weight = max(0.0, min(1.0, weeks_of_store_data / full_weeks))
    return store_weight * store_specific_prediction + (1 - store_weight) * category_avg_prediction
