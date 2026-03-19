"""
楽天市場API から Nintendo Switch カテゴリの商品を取得し Supabase に保存する。
レート制限: 1秒1リクエスト (sleep(1) 必須)
"""

import os
import time
import logging
from datetime import datetime, timezone

import requests
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RAKUTEN_APP_ID = os.environ["RAKUTEN_APP_ID"]

RAKUTEN_SEARCH_URL = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706"

# Nintendo Switch 関連ジャンル ID
SEARCH_KEYWORDS = [
    "Nintendo Switch 本体",
    "Nintendo Switch ソフト",
]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_rakuten_items(keyword: str, page: int = 1) -> dict:
    params = {
        "applicationId": RAKUTEN_APP_ID,
        "keyword": keyword,
        "hits": 30,
        "page": page,
        "sort": "-reviewCount",
        "availability": 1,
        "format": "json",
        "NGKeyword": "中古",
    }
    resp = requests.get(RAKUTEN_SEARCH_URL, params=params, timeout=10)
    if not resp.ok:
        logger.error("APIレスポンス: %s", resp.text[:300])
    resp.raise_for_status()
    return resp.json()


def upsert_product(jan_code: str, name: str, category: str) -> str:
    """商品マスタにupsertしてproduct_idを返す"""
    res = supabase.table("products").upsert(
        {
            "jan_code": jan_code,
            "name": name,
            "category": category,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="jan_code",
    ).execute()
    return res.data[0]["id"]


def upsert_sale_price(
    product_id: str,
    price: int,
    point_rate: float,
    real_price: int,
    item_url: str,
    image_url: str,
) -> None:
    supabase.table("sale_prices").upsert(
        {
            "product_id": product_id,
            "platform": "rakuten",
            "price": price,
            "point_rate": point_rate,
            "real_price": real_price,
            "item_url": item_url,
            "image_url": image_url,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="product_id,platform",
    ).execute()


def calc_real_price(price: int, point_rate: float) -> int:
    """楽天ポイント（通常分のみ）を考慮した実質価格"""
    total_rate = point_rate / 100
    return int(price * (1 - total_rate))


def run(max_items: int = 100) -> None:
    logger.info("楽天API取得開始 (目標: %d件)", max_items)
    count = 0

    for keyword in SEARCH_KEYWORDS:
        if count >= max_items:
            break

        page = 1
        while count < max_items:
            logger.info("keyword='%s' page=%d 取得中...", keyword, page)
            try:
                data = fetch_rakuten_items(keyword, page)
            except requests.RequestException as e:
                logger.error("APIエラー: %s", e)
                break

            items = data.get("Items", [])
            if not items:
                break

            for item_wrapper in items:
                item = item_wrapper["Item"]
                jan_code = item.get("janCode", "").strip()
                if not jan_code:
                    continue

                name = item.get("itemName", "")[:200]
                price = int(item.get("itemPrice", 0))
                point_rate = float(item.get("pointRate", 1))
                real_price = calc_real_price(price, point_rate)
                item_url = item.get("itemUrl", "")
                images = item.get("mediumImageUrls", [])
                image_url = images[0]["imageUrl"] if images else ""

                try:
                    product_id = upsert_product(jan_code, name, "nintendo_switch")
                    upsert_sale_price(
                        product_id, price, point_rate, real_price, item_url, image_url
                    )
                    count += 1
                    logger.info("[%d] %s (¥%d → 実質¥%d)", count, name[:40], price, real_price)
                except Exception as e:
                    logger.error("DB書き込みエラー: %s", e)

                if count >= max_items:
                    break

            # 次ページがなければ終了
            total_pages = data.get("pageCount", 1)
            if page >= total_pages:
                break
            page += 1
            time.sleep(1)  # レート制限: 1秒1リクエスト

    logger.info("完了: %d件取得", count)


if __name__ == "__main__":
    run(max_items=100)
