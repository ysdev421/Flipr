"""
利益計算バッチ: products × sale_prices × kaitori_prices を突合して
profit_summary テーブルを更新する。
"""

import logging
import os
from datetime import datetime, timezone

from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_sale_prices() -> list[dict]:
    res = supabase.table("sale_prices").select(
        "product_id, platform, price, point_rate, real_price, item_url, image_url, fetched_at"
    ).execute()
    return res.data or []


def fetch_kaitori_prices() -> dict[str, list[dict]]:
    """product_id をキーにした買取価格の辞書を返す"""
    res = supabase.table("kaitori_prices").select(
        "product_id, shop, price, condition, scraped_at"
    ).execute()
    result: dict[str, list[dict]] = {}
    for row in (res.data or []):
        pid = row["product_id"]
        result.setdefault(pid, []).append(row)
    return result


def calc_profit_summary(
    sale: dict,
    kaitori_list: list[dict],
) -> dict | None:
    """1商品・1プラットフォームの最良利益サマリを計算"""
    if not kaitori_list:
        return None

    best = max(kaitori_list, key=lambda x: x["price"])
    best_price = best["price"]
    real_price = sale["real_price"]
    profit = best_price - real_price
    profit_rate = round(profit / real_price * 100, 2) if real_price > 0 else 0.0

    return {
        "product_id": sale["product_id"],
        "platform": sale["platform"],
        "sale_price": sale["price"],
        "real_price": real_price,
        "best_kaitori_price": best_price,
        "best_kaitori_shop": best["shop"],
        "profit": profit,
        "profit_rate": profit_rate,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def run() -> None:
    logger.info("利益計算開始")

    sale_prices = fetch_sale_prices()
    kaitori_map = fetch_kaitori_prices()

    logger.info("販売価格: %d件, 買取価格: %d商品", len(sale_prices), len(kaitori_map))

    summaries = []
    for sale in sale_prices:
        pid = sale["product_id"]
        kaitori_list = kaitori_map.get(pid, [])
        summary = calc_profit_summary(sale, kaitori_list)
        if summary:
            summaries.append(summary)

    if not summaries:
        logger.info("計算対象なし（JANコード突合できた商品がありません）")
        return

    # バッチupsert（100件ずつ）
    BATCH = 100
    for i in range(0, len(summaries), BATCH):
        batch = summaries[i:i + BATCH]
        supabase.table("profit_summary").upsert(
            batch,
            on_conflict="product_id,platform",
        ).execute()
        logger.info("保存 %d〜%d件目", i + 1, i + len(batch))

    logger.info("利益計算完了: %d件更新", len(summaries))

    # 上位5件をログ出力
    top5 = sorted(summaries, key=lambda x: x["profit_rate"], reverse=True)[:5]
    logger.info("=== 利益率TOP5 ===")
    for r in top5:
        logger.info(
            "product_id=%s platform=%s 利益率=%.1f%% 利益=¥%d",
            r["product_id"][:8], r["platform"], r["profit_rate"], r["profit"]
        )


if __name__ == "__main__":
    run()
