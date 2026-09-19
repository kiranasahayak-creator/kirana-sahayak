"""Standard forecast evaluation metrics. Return None where a metric isn't
computable (e.g. MAPE with all-zero actuals) rather than a misleading 0."""
from typing import List, Optional

import numpy as np


def mae(y_true: List[float], y_pred: List[float]) -> float:
    return float(np.mean(np.abs(np.array(y_true, dtype=float) - np.array(y_pred, dtype=float))))


def rmse(y_true: List[float], y_pred: List[float]) -> float:
    diff = np.array(y_true, dtype=float) - np.array(y_pred, dtype=float)
    return float(np.sqrt(np.mean(diff**2)))


def mape(y_true: List[float], y_pred: List[float]) -> Optional[float]:
    y_true_arr = np.array(y_true, dtype=float)
    y_pred_arr = np.array(y_pred, dtype=float)
    mask = y_true_arr != 0
    if not mask.any():
        return None
    return float(np.mean(np.abs((y_true_arr[mask] - y_pred_arr[mask]) / y_true_arr[mask])) * 100)
