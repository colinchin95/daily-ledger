// 馬來西亞常見的銀行 / 電子錢包,給「新增帳戶」挑選用。
//
// 有 logo 的顯示該機構在 App Store 上自家 App 的圖示(icons/banks/,128px,取自 iTunes Search API)。
// ⚠️ 使用者決定採用官方 logo(已告知 Apple 5.2.1 / Google Play 商標風險);若審核或品牌方要求移除,
//    刪掉該筆的 logo 欄位即自動退回品牌色 + 簡稱徽章。
//
// kind:bank / ewallet / other。id 固定,存進帳戶的 inst 欄位,同步到別台裝置也對得上。

export const INSTITUTIONS = [
  // ---- 電子錢包 ----
  { id: 'tng',       name: "Touch 'n Go eWallet", short: 'TNG',   bg: '#005ABB', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/tng.png' },
  { id: 'grabpay',   name: 'GrabPay',             short: 'Grab',  bg: '#00B14F', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/grabpay.png' },
  { id: 'shopeepay', name: 'ShopeePay',           short: 'SPay',  bg: '#EE4D2D', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/shopeepay.png' },
  { id: 'boost',     name: 'Boost',               short: 'Boost', bg: '#EE2E24', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/boost.png' },
  { id: 'mae',       name: 'MAE',                 short: 'MAE',   bg: '#FFC72C', fg: '#1A1A1A', kind: 'ewallet', logo: 'icons/banks/mae.png' },
  { id: 'bigpay',    name: 'BigPay',              short: 'Big',   bg: '#1B1B1B', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/bigpay.png' },
  { id: 'setel',     name: 'Setel',               short: 'Setel', bg: '#00A19A', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/setel.png' },
  { id: 'lazada',    name: 'Lazada Wallet',       short: 'Laz',   bg: '#0F146D', fg: '#FFFFFF', kind: 'ewallet', logo: 'icons/banks/lazada.png' },

  // ---- 銀行 ----
  { id: 'maybank',    name: 'Maybank',             short: 'MBB',   bg: '#FFC72C', fg: '#1A1A1A', kind: 'bank', logo: 'icons/banks/maybank.png' },
  { id: 'cimb',       name: 'CIMB',                short: 'CIMB',  bg: '#EC1C24', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/cimb.png' },
  { id: 'publicbank', name: 'Public Bank',         short: 'PBB',   bg: '#D71920', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/publicbank.png' },
  { id: 'rhb',        name: 'RHB',                 short: 'RHB',   bg: '#0067B1', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/rhb.png' },
  { id: 'hongleong',  name: 'Hong Leong Bank',     short: 'HLB',   bg: '#00205B', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/hongleong.png' },
  { id: 'ambank',     name: 'AmBank',              short: 'Am',    bg: '#EE3124', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/ambank.png' },
  { id: 'uob',        name: 'UOB',                 short: 'UOB',   bg: '#0B3B8C', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/uob.png' },
  { id: 'ocbc',       name: 'OCBC',                short: 'OCBC',  bg: '#E3000F', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/ocbc.png' },
  { id: 'hsbc',       name: 'HSBC',                short: 'HSBC',  bg: '#DB0011', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/hsbc.png' },
  { id: 'sc',         name: 'Standard Chartered',  short: 'SC',    bg: '#0072AA', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/sc.png' },
  { id: 'citi',       name: 'Citibank',            short: 'Citi',  bg: '#003B70', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/citi.png' },
  { id: 'bankislam',  name: 'Bank Islam',          short: 'BIMB',  bg: '#B5005B', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/bankislam.png' },
  { id: 'bankrakyat', name: 'Bank Rakyat',         short: 'BKR',   bg: '#003A70', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/bankrakyat.png' },
  { id: 'bsn',        name: 'BSN',                 short: 'BSN',   bg: '#0B4EA2', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/bsn.png' },
  { id: 'affin',      name: 'Affin Bank',          short: 'Affin', bg: '#003B7A', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/affin.png' },
  { id: 'alliance',   name: 'Alliance Bank',       short: 'ABMB',  bg: '#6D2077', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/alliance.png' },
  { id: 'muamalat',   name: 'Bank Muamalat',       short: 'BMMB',  bg: '#5B2C83', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/muamalat.png' },
  { id: 'agrobank',   name: 'Agrobank',            short: 'Agro',  bg: '#00843D', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/agrobank.png' },
  { id: 'mbsb',       name: 'MBSB Bank',           short: 'MBSB',  bg: '#0055A5', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/mbsb.png' },
  { id: 'gxbank',     name: 'GXBank',              short: 'GX',    bg: '#5B2DDC', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/gxbank.png' },
  { id: 'aeonbank',   name: 'AEON Bank',           short: 'AEON',  bg: '#B6007A', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/aeonbank.png' },
  { id: 'boostbank',  name: 'Boost Bank',          short: 'Boost', bg: '#C8102E', fg: '#FFFFFF', kind: 'bank', logo: 'icons/banks/boostbank.png' },

  // ---- 其他 ----
  { id: 'cash',       name: 'Cash',                short: 'RM',    bg: '#6E8B4A', fg: '#FFFFFF', kind: 'other' },
  { id: 'creditcard', name: 'Credit card',         short: 'Card',  bg: '#3C3A36', fg: '#FFFFFF', kind: 'other' },
  { id: 'savings',    name: 'Savings / ASB',       short: 'Save',  bg: '#4E8C7B', fg: '#FFFFFF', kind: 'other' },
];

export const INSTITUTION_MAP = new Map(INSTITUTIONS.map((x) => [x.id, x]));
