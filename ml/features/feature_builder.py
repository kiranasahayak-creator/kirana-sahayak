"""
Builds the weekly (store, product) demand table with the features the model
uses. Shared by both training and prediction so the two never drift apart.

Grain: one row per (store_id, product_id, week_start), where week_start is
the Monday of that ISO week. This maps directly onto "predict next week's
demand" rather than needing a separate daily model.

Known simplification, documented rather than hidden: current inventory
level and weather are NOT included as historical training features here,
because the seed data only captures a single "current" stock snapshot (not
a day-by-day stock history) and no weather data is seeded yet. Both are
structurally supported (Product.currentStock, the WeatherData table) and
used at prediction time / in the order-quantity calculation — they're just
not part of what the model learns from historical weeks. See ml/README.md.
"""
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

NUMERIC_FEATURE_COLUMNS = [
    "week_of_year",
    "margin",
    "festival_in_week",
    "rolling_avg_4w",
    "rolling_avg_8w",
    "prev_week_quantity",
    "trend",
    "weekend_ratio",
    "selling_price",
    "cost_price",
]


def load_weekly_sales(engine: Engine) -> pd.DataFrame:
    query = text(
        """
        SELECT
            s.store_id,
            si.product_id,
            date_trunc('week', s.transaction_date)::date AS week_start,
            SUM(si.quantity) AS quantity,
            SUM(CASE WHEN EXTRACT(DOW FROM s.transaction_date) IN (0, 6)
                     THEN si.quantity ELSE 0 END) AS weekend_quantity,
            p.category,
            p.selling_price::float AS selling_price,
            p.cost_price::float AS cost_price
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        GROUP BY s.store_id, si.product_id, week_start, p.category,
                 p.selling_price, p.cost_price
        ORDER BY s.store_id, si.product_id, week_start
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
    if df.empty:
        return df
    df["weekend_ratio"] = (df["weekend_quantity"] / df["quantity"]).fillna(0)
    return df


def load_festivals(engine: Engine) -> pd.DataFrame:
    with engine.connect() as conn:
        return pd.read_sql(text("SELECT date, name, region FROM festivals"), conn)


def load_all_products(engine: Engine) -> pd.DataFrame:
    """Every product per store, including ones with zero sales history yet
    (needed by generate_forecasts.py to still produce a category-average-based
    forecast for brand-new SKUs)."""
    query = text(
        """
        SELECT id AS product_id, store_id, name, category,
               selling_price::float AS selling_price,
               cost_price::float AS cost_price,
               current_stock, supplier_moq
        FROM products
        """
    )
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


def _festival_flag_fn(festival_dates: pd.Series):
    def has_festival(week_start: pd.Timestamp) -> int:
        week_end = week_start + pd.Timedelta(days=6)
        return int(((festival_dates >= week_start) & (festival_dates <= week_end)).any())

    return has_festival


def build_features(weekly: pd.DataFrame, festivals: pd.DataFrame) -> pd.DataFrame:
    """
    Adds engineered columns to the raw weekly aggregates. Rolling stats are
    shift(1)'d before the rolling window so a week's features only ever use
    data strictly before that week — no leakage from the label into the
    features used to predict it.
    """
    if weekly.empty:
        return weekly

    df = weekly.copy()
    df["week_start"] = pd.to_datetime(df["week_start"])
    df["week_of_year"] = df["week_start"].dt.isocalendar().week.astype(int)
    df["margin"] = (df["selling_price"] - df["cost_price"]) / df["selling_price"].replace(0, pd.NA)
    df["margin"] = df["margin"].fillna(0)

    festival_dates = (
        pd.to_datetime(festivals["date"]) if not festivals.empty else pd.Series([], dtype="datetime64[ns]")
    )
    df["festival_in_week"] = df["week_start"].apply(_festival_flag_fn(festival_dates))

    df = df.sort_values(["store_id", "product_id", "week_start"])
    grp = df.groupby(["store_id", "product_id"])["quantity"]
    df["rolling_avg_4w"] = grp.transform(lambda s: s.shift(1).rolling(4, min_periods=1).mean())
    df["rolling_avg_8w"] = grp.transform(lambda s: s.shift(1).rolling(8, min_periods=1).mean())
    df["prev_week_quantity"] = grp.shift(1)
    df["trend"] = (df["rolling_avg_4w"] - df["rolling_avg_8w"]).fillna(0)

    # A product's very first observed week has no prior data to compute a
    # rolling average from — not usable as a training example.
    df = df.dropna(subset=["rolling_avg_4w"]).reset_index(drop=True)
    return df
