"""Bundle the sibling drink-ordering-gh frontend into GAS Index.html.

GAS HtmlService serves one HTML template here; CSS, menus and images must be
embedded because Code.gs is intentionally unchanged.
"""

from base64 import b64encode
from pathlib import Path
import mimetypes
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "drink-ordering-gh"


def read(name):
    return (SOURCE / name).read_text(encoding="utf-8-sig")


def body_before_script(name):
    html = read(name)
    body = re.search(r"<body[^>]*>(.*?)<script(?:\s|>)", html, re.S)
    if not body:
        raise ValueError(f"找不到 {name} 的頁面內容")
    return body.group(1)


home = body_before_script("index.html")
shop = body_before_script("shop.html")

home = home.replace("shop.html?shop=", "?shop=")
home = home.replace("開源於 GitHub Pages", "Google Apps Script 版本")
shop = shop.replace('href="index.html"', 'href="?"')
shop = shop.replace("開源於 GitHub Pages", "Google Apps Script 版本")
shop = re.sub(r'\s*<!-- 離線示範模式提示.*?</div>', '', shop, count=1, flags=re.S)
shop = shop.replace('class="indicator-text">已連線', 'class="indicator-text">每 15 秒更新')
shop = shop.replace('清除此店家的所有訂單', '清除所有店家的訂單')
shop = shop.replace('清除本頁全部訂單', '清除所有店家訂單')
shop = shop.replace('主揪人登入', '管理員清除訂單')
shop = shop.replace('登入後才能刪除別人的訂單、或一次清除本頁全部訂單。一般訂購者不需要登入，也隨時可以刪除自己的訂單。', '輸入管理密碼後，將清除試算表中所有店家的訂單。一般訂購者可刪除自己的訂單。')
shop = shop.replace('登入後才能刪除別人的訂單、或一次清除所有店家訂單。一般訂購者不需要登入，也隨時可以刪除自己的訂單。', '輸入管理密碼後，將清除試算表中所有店家的訂單。一般訂購者可刪除自己的訂單。')
shop = shop.replace('<span class="btn-text">登入</span>', '<span class="btn-text">清除全部訂單</span>')
shop = shop.replace('密碼錯誤，請再試一次', '請輸入管理密碼')
shop = shop.replace('<!-- Firebase Script SDK and App Script -->', '')
shop = shop.replace('<!-- 主揪人專區：未登入只露出登入入口，登入成功後才出現清除全部訂單 -->', '<!-- GAS 管理員清除入口 -->')

# The source's login-only tools would advertise permissions this backend lacks.
start = shop.index('<div class="host-tools hidden"')
depth = 0
end = None
for tag in re.finditer(r'</?div\b[^>]*>', shop[start:]):
    depth += -1 if tag.group().startswith('</') else 1
    if depth == 0:
        end = start + tag.end()
        break
if end is None:
    raise ValueError('找不到來源管理工具區塊的結尾')
shop = shop[:start] + shop[end:]

home = home.replace('href="https://changyiwu.github.io/drink-ordering-gh/"', 'href="#" id="share-link"')
home = home.replace('changyiwu.github.io/drink-ordering-gh', '目前 GAS 網頁網址')
home = home.replace('src="images/qr_home.svg"', 'src="" data-qr-image')

# An existing untagged GAS order cannot be assigned to one of the five shops.
# Show it on the home page so migration does not hide old records.
legacy = '''
<section class="glass-card legacy-section" id="legacy-section" hidden>
  <h2><i class="fa-solid fa-clock-rotate-left"></i> 原有未分類訂單</h2>
  <p class="section-desc">這些訂單建立於店家分類上線前，仍保留在原試算表中。</p>
  <div id="legacy-list"></div>
</section>
'''
home = home.replace('</main>', legacy + '</main>', 1)


def embed_images(markup):
    def replace(match):
        relative = match.group(1)
        path = SOURCE / relative
        if not path.is_file():
            raise FileNotFoundError(path)
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        encoded = b64encode(path.read_bytes()).decode("ascii")
        return f'data:{mime};base64,{encoded}'

    return re.sub(r'(images/(?:drink_banner\.(?:webp|jpg)|logo_[a-z0-9]+\.(?:webp|png|svg)))', replace, markup)


home = embed_images(home)
shop = embed_images(shop)
css = read("styles.css").replace('QR Code 是離線產生的靜態 SVG（images/qr_home.svg），不依賴任何線上', 'QR Code 依目前 GAS 網頁網址產生，並顯示於首頁') + "\n[hidden] { display: none !important; }\n.legacy-section { grid-column: 1 / -1; }\n.legacy-section p { margin: 8px 0; }\n"
menu = read("menu_data.js").replace("export const SHOPS_DATA", "const SHOPS_DATA", 1)
app = (ROOT / "tools" / "gas_app.js").read_text(encoding="utf-8")

output = f'''<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="作伙喝飲料：選擇店家、填寫飲料訂單並查看訂購看板。">
<title>作伙喝飲料！</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>{css}</style>
</head>
<body>
<div id="home-page">{home}</div>
<div id="shop-page" hidden>{shop}</div>
<script>{menu}</script>
<script>const GAS_APP_URL = '<?= ScriptApp.getService().getUrl() || "" ?>';\n{app}</script>
</body>
</html>
'''
output = '\n'.join(line.rstrip() for line in output.splitlines()) + '\n'
(ROOT / "Index.html").write_text(output, encoding="utf-8", newline="\n")
print(f"已產生 {ROOT / 'Index.html'} ({len(output):,} 字元)")
