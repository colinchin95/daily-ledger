# 日常記帳 Daily Ledger — 專案摘要

> 這份檔案是給「拿去問 AI / 給別人看」用的產品+技術摘要。
> 線上版:https://colinchin95.github.io/daily-ledger/
> 原始碼:https://github.com/colinchin95/daily-ledger

## 一句話定位
本機優先(local-first)、不需註冊、無廣告、無付費牆的個人記帳 PWA;
資料預設只存在使用者裝置上,可選擇開啟「端到端加密」雲端同步。

## 目標使用者
給自己用的單人記帳。馬來西亞令吉(MYR),介面中/英可切換。

## 技術規格(刻意的設計選擇)
- 純前端:HTML + CSS + 原生 JavaScript,無框架、無建置步驟。
- 儲存:IndexedDB(經 idb-keyval 包裝);金額一律以「分」為整數儲存與計算,
  顯示才除以 100,避免浮點誤差。
- PWA:manifest + service worker,可安裝到主畫面、離線完全可用。
- 可選雲端同步:Cloudflare Worker + KV;資料在裝置上用 AES-GCM 加密後才上傳,
  伺服器只存密文;金鑰由「同步碼」經 PBKDF2 推導,從不上傳。無帳號。
- 介面:iOS 深色設計語彙 + 金色點綴,手機直式優先。

## 已完成功能
1. 快速記帳:大數字鍵盤、分類、備註、日期(預設今天)、支出/收入切換。
2. 帳目列表:依日期分組(今天/昨天)、每日小計、點擊可編輯/刪除。
3. 分類管理:內建分類 + 自訂新增/改名/換色/刪除;支出與收入分開;
   內建分類名稱隨介面語言切換,使用者改過名的維持自訂名。
4. 月報表:本月支出大數字 + 收入 + 結餘;各分類佔比橫條;可切換月份。
5. 分類明細:點報表分類可看該分類當月每一筆,點任一筆可編輯。
6. 每月預算:整月預算進度條(綠/琥珀/紅)+ 各分類預算 + 超支標記。
7. 固定/循環支出:設定一次,每月到指定日自動帶入一筆。
8. 搜尋:依備註/分類/金額篩選帳目。
9. 近 6 個月趨勢:CSS 長條圖,點長條跳該月。
10. 資料備份:JSON 匯出/匯入(以 id 合併)、CSV 匯出、太久沒備份會提醒、
    可一鍵分享到 iOS「檔案」/iCloud;設定頁顯示上次備份時間。
11. App 鎖:可選 4–6 位數 PIN(加鹽 SHA-256 存本機,不含在備份)。
12. 中英文切換:文字、日期、貨幣格式全跟著語言走。
13. 端到端加密雲端同步:同步碼模式,換機/刪 App 重裝輸入同碼即還原。

## 刻意「不做」的事
- 不做後端帳號系統、不收集使用者資料。
- 不串接銀行/自動匯入交易。
- 不放廣告、不做付費訂閱。
- 不做社交/分帳/多人協作(目前為單人)。

## 資料模型(重點)
- entry: { id, createdAt, amountCents(整數分), type: 'expense'|'income',
  categoryId, note, date 'YYYY-MM-DD', recurringId? }
- category: { id, name, color, type, renamed?, budgetCents? }
- meta: { monthlyBudgetCents }
- recurring: { id, amountCents, type, categoryId, note, dayOfMonth, lastRun }

## 我想問的問題
我可以加哪些功能,讓這個 App 跟市面上的記帳 App(如 Money Manager、
MoneyLover、YNAB、記帳城市等)做出差異?哪些差異是真的有價值、值得做的?
