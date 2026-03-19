"""
森森買取 (morimori-kaitori.jp) のゲームカテゴリをスクレイピングして Supabase に保存する。
リクエスト間隔: 最低3秒 (asyncio.sleep(3))
"""

import asyncio
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# スクレイピング対象カテゴリURL
CATEGORY_URLS = [
    ("https://www.morimori-kaitori.jp/category/0104", "nintendo_switch"),  # Nintendo Switch
    ("https://www.morimori-kaitori.jp/category/0101", "ps5"),              # PS5
]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def extract_jan(text: str) -> str | None:
    """ページテキストから 'JAN:XXXXXXXXXX' を抽出"""
    m = re.search(r"JAN[：:]\s*(\d{8,13})", text)
    return m.group(1) if m else None


def extract_price(text: str) -> int:
    """'¥1,234' や '1234円' を int に変換"""
    m = re.search(r"[\d,]+", text.replace(",", ""))
    return int(m.group(0)) if m else 0


def upsert_product(jan_code: str, name: str, category: str) -> str:
    """products に upsert して product_id を返す"""
    res = supabase.table("products").upsert(
        {
            "jan_code": jan_code,
            "name": name[:200] if name else jan_code,
            "category": category,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="jan_code",
    ).execute()
    return res.data[0]["id"]


async def scrape_item_page(page: Page, url: str) -> dict | None:
    """個別商品ページから情報を取得"""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(1)

        jan_code = extract_jan(await page.inner_text("body"))
        if not jan_code:
            return None

        name_el = await page.query_selector("h1, .product-name, .item-name")
        name = (await name_el.inner_text()).strip() if name_el else ""

        # 通常買取価格
        price = 0
        price_els = await page.query_selector_all(".kaitori-price, .price-normal, [class*='price']")
        for el in price_els:
            txt = await el.inner_text()
            p = extract_price(txt)
            if p > 0:
                price = p
                break

        return {
            "jan_code": jan_code,
            "name": name[:200],
            "price": price,
        }
    except Exception as e:
        logger.warning("商品ページ取得エラー %s: %s", url, e)
        return None


async def scrape_category(page: Page, category_url: str, category: str) -> list[dict]:
    """カテゴリページから商品リンクを収集し各商品をスクレイピング"""
    items = []
    current_url = category_url

    while current_url:
        logger.info("カテゴリページ取得: %s", current_url)
        try:
            await page.goto(current_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)
            try:
                await page.wait_for_selector("a[href*='/product/']", timeout=8000)
            except Exception:
                # セレクタで見つからない環境向けに後続でHTMLフォールバックする
                pass
        except Exception as e:
            logger.error("カテゴリページ取得エラー: %s", e)
            break

        # 商品リンクを収集（森森の商品URL形式: /category/<id>/product/<id>）
        all_links = await page.query_selector_all("a[href*='/product/']")
        hrefs = set()
        for link in all_links:
            href = await link.get_attribute("href")
            if not href:
                continue
            full = urljoin("https://www.morimori-kaitori.jp", href)
            if "/product/" in full and "morimori-kaitori.jp" in full:
                hrefs.add(full)

        # フォールバック: HTML文字列からリンクを抽出
        if not hrefs:
            html = await page.content()
            for path in re.findall(r"""['"](/category/\d+/product/\d+)['"]""", html):
                hrefs.add(urljoin("https://www.morimori-kaitori.jp", path))

        hrefs = list(hrefs)
        if hrefs:
            logger.info("%d件の商品リンクを発見 (例: %s)", len(hrefs), hrefs[:2])
        else:
            logger.info(
                "0件の商品リンクを発見 (title=%s url=%s)",
                await page.title(),
                current_url,
            )

        for full_url in hrefs:
            item = await scrape_item_page(page, full_url)
            if item:
                item["category"] = category
                items.append(item)
                logger.info("取得: %s JAN=%s ¥%d", item["name"][:40], item["jan_code"], item["price"])
            await asyncio.sleep(3)  # リクエスト間隔: 最低3秒

        # 次ページ
        next_el = await page.query_selector("a[rel='next'], .pagination .next a, a:has-text('次へ')")
        if next_el:
            next_href = await next_el.get_attribute("href")
            current_url = next_href if next_href and next_href.startswith("http") else (
                f"https://www.morimori-kaitori.jp{next_href}" if next_href else None
            )
        else:
            current_url = None

    return items


def save_kaitori_prices(items: list[dict]) -> int:
    saved = 0
    for item in items:
        jan_code = item["jan_code"]
        price = item["price"]
        if price <= 0:
            continue

        # 楽天側が未取得でも保存できるよう products を補完する
        product_id = upsert_product(jan_code, item.get("name", ""), item.get("category", ""))

        supabase.table("kaitori_prices").upsert(
            {
                "product_id": product_id,
                "shop": "morimori",
                "price": price,
                "condition": "新品",
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="product_id,shop,condition",
        ).execute()
        saved += 1

    return saved


async def run() -> None:
    logger.info("森森買取スクレイピング開始")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            ),
            locale="ja-JP",
        )
        page = await context.new_page()

        all_items: list[dict] = []
        for url, category in CATEGORY_URLS:
            items = await scrape_category(page, url, category)
            all_items.extend(items)
            await asyncio.sleep(3)

        await context.close()
        await browser.close()

    logger.info("スクレイピング完了: %d件", len(all_items))
    saved = save_kaitori_prices(all_items)
    logger.info("DB保存完了: %d件", saved)


if __name__ == "__main__":
    asyncio.run(run())
