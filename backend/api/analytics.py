import pandas as pd
import numpy as np
from .storage import get_all_records


def calculate_analytics_summary(user_role="Admin", user_id=None):
    records = get_all_records()

    # Fallback structure if records.json is empty
    fallback = {
        "total_items": 0,
        "total_units": 0,
        "total_valuation": 0.0,
        "avg_unit_price": 0.0,
        "low_stock_count": 0,
        "category_summary": []
    }

    if not records:
        return fallback

    try:
        df = pd.DataFrame(records)

        # Ensure required columns exist
        if 'quantity' not in df.columns:
            df['quantity'] = 0
        if 'unit_price' not in df.columns:
            df['unit_price'] = 0.0

        # Safe numeric parsing
        df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce').fillna(0).astype(int)
        df['unit_price'] = pd.to_numeric(df['unit_price'], errors='coerce').fillna(0.0).astype(float)

        # NumPy vector calculations
        quantities = df['quantity'].to_numpy()
        prices = df['unit_price'].to_numpy()
        valuation_array = quantities * prices

        total_units = int(np.sum(quantities))
        total_valuation = float(np.round(np.sum(valuation_array), 2))
        avg_price = float(np.round(np.mean(prices), 2)) if len(prices) > 0 else 0.0

        # Low stock detection (<= 10 units)
        low_stock_count = int(np.sum(quantities <= 10))

        # Category aggregations using Pandas
        category_summary = []
        if 'category' in df.columns:
            grouped = df.groupby('category').agg(
                item_count=('id', 'count'),
                total_qty=('quantity', 'sum'),
                avg_price=('unit_price', 'mean')
            ).reset_index()

            category_summary = [
                {
                    "category": str(row['category']),
                    "item_count": int(row['item_count']),
                    "total_qty": int(row['total_qty']),
                    "avg_price": float(round(row['avg_price'], 2))
                }
                for _, row in grouped.iterrows()
            ]

        return {
            "total_items": int(len(df)),
            "total_units": total_units,
            "total_valuation": total_valuation,
            "avg_unit_price": avg_price,
            "low_stock_count": low_stock_count,
            "category_summary": category_summary
        }
    except Exception as e:
        print(f"Error in analytics calculation: {e}")
        return fallback