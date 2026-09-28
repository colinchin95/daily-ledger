// 馬來西亞常見的銀行 / 電子錢包,給「新增帳戶」挑選用。
//
// 徽章用品牌色 + 簡稱畫,不內建各家的官方 logo 圖檔:
// Apple 5.2.1 / Google Play 都不允許未經授權使用第三方商標圖像。
// 若日後取得授權,在該筆加上 logo: 'icons/banks/xxx.png' 就會改顯示圖片。
//
// kind:bank / ewallet / other。id 固定,存進帳戶的 inst 欄位,同步到別台裝置也對得上。

export const INSTITUTIONS = [
  // ---- 電子錢包 ----
  { id: 'tng',       name: "Touch 'n Go eWallet", short: 'TNG',   bg: '#005ABB', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'grabpay',   name: 'GrabPay',             short: 'Grab',  bg: '#00B14F', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'shopeepay', name: 'ShopeePay',           short: 'SPay',  bg: '#EE4D2D', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'boost',     name: 'Boost',               short: 'Boost', bg: '#EE2E24', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'mae',       name: 'MAE',                 short: 'MAE',   bg: '#FFC72C', fg: '#1A1A1A', kind: 'ewallet' },
  { id: 'bigpay',    name: 'BigPay',              short: 'Big',   bg: '#1B1B1B', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'setel',     name: 'Setel',               short: 'Setel', bg: '#00A19A', fg: '#FFFFFF', kind: 'ewallet' },
  { id: 'lazada',    name: 'Lazada Wallet',       short: 'Laz',   bg: '#0F146D', fg: '#FFFFFF', kind: 'ewallet' },

  // ---- 銀行 ----
  { id: 'maybank',    name: 'Maybank',             short: 'MBB',   bg: '#FFC72C', fg: '#1A1A1A', kind: 'bank' },
  { id: 'cimb',       name: 'CIMB',                short: 'CIMB',  bg: '#EC1C24', fg: '#FFFFFF', kind: 'bank' },
  { id: 'publicbank', name: 'Public Bank',         short: 'PBB',   bg: '#D71920', fg: '#FFFFFF', kind: 'bank' },
  { id: 'rhb',        name: 'RHB',                 short: 'RHB',   bg: '#0067B1', fg: '#FFFFFF', kind: 'bank' },
  { id: 'hongleong',  name: 'Hong Leong Bank',     short: 'HLB',   bg: '#00205B', fg: '#FFFFFF', kind: 'bank' },
  { id: 'ambank',     name: 'AmBank',              short: 'Am',    bg: '#EE3124', fg: '#FFFFFF', kind: 'bank' },
  { id: 'uob',        name: 'UOB',                 short: 'UOB',   bg: '#0B3B8C', fg: '#FFFFFF', kind: 'bank' },
  { id: 'ocbc',       name: 'OCBC',                short: 'OCBC',  bg: '#E3000F', fg: '#FFFFFF', kind: 'bank' },
  { id: 'hsbc',       name: 'HSBC',                short: 'HSBC',  bg: '#DB0011', fg: '#FFFFFF', kind: 'bank' },
  { id: 'sc',         name: 'Standard Chartered',  short: 'SC',    bg: '#0072AA', fg: '#FFFFFF', kind: 'bank' },
  { id: 'citi',       name: 'Citibank',            short: 'Citi',  bg: '#003B70', fg: '#FFFFFF', kind: 'bank' },
  { id: 'bankislam',  name: 'Bank Islam',          short: 'BIMB',  bg: '#B5005B', fg: '#FFFFFF', kind: 'bank' },
  { id: 'bankrakyat', name: 'Bank Rakyat',         short: 'BKR',   bg: '#003A70', fg: '#FFFFFF', kind: 'bank' },
  { id: 'bsn',        name: 'BSN',                 short: 'BSN',   bg: '#0B4EA2', fg: '#FFFFFF', kind: 'bank' },
  { id: 'affin',      name: 'Affin Bank',          short: 'Affin', bg: '#003B7A', fg: '#FFFFFF', kind: 'bank' },
  { id: 'alliance',   name: 'Alliance Bank',       short: 'ABMB',  bg: '#6D2077', fg: '#FFFFFF', kind: 'bank' },
  { id: 'muamalat',   name: 'Bank Muamalat',       short: 'BMMB',  bg: '#5B2C83', fg: '#FFFFFF', kind: 'bank' },
  { id: 'agrobank',   name: 'Agrobank',            short: 'Agro',  bg: '#00843D', fg: '#FFFFFF', kind: 'bank' },
  { id: 'mbsb',       name: 'MBSB Bank',           short: 'MBSB',  bg: '#0055A5', fg: '#FFFFFF', kind: 'bank' },
  { id: 'gxbank',     name: 'GXBank',              short: 'GX',    bg: '#5B2DDC', fg: '#FFFFFF', kind: 'bank' },
  { id: 'aeonbank',   name: 'AEON Bank',           short: 'AEON',  bg: '#B6007A', fg: '#FFFFFF', kind: 'bank' },
  { id: 'boostbank',  name: 'Boost Bank',          short: 'Boost', bg: '#C8102E', fg: '#FFFFFF', kind: 'bank' },

  // ---- 其他 ----
  { id: 'cash',       name: 'Cash',                short: 'RM',    bg: '#6E8B4A', fg: '#FFFFFF', kind: 'other' },
  { id: 'creditcard', name: 'Credit card',         short: 'Card',  bg: '#3C3A36', fg: '#FFFFFF', kind: 'other' },
  { id: 'savings',    name: 'Savings / ASB',       short: 'Save',  bg: '#4E8C7B', fg: '#FFFFFF', kind: 'other' },
];

export const INSTITUTION_MAP = new Map(INSTITUTIONS.map((x) => [x.id, x]));
