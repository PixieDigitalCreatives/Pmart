// Indian numbering system to Hindi & English words converter

const ONES_HI = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];
const TENS_HI = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];
const TWO_DIGITS_HI = [
  '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
  'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस',
  'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस',
  'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास',
  'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ',
  'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर',
  'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्नासी', 'अस्सी',
  'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे',
  'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
];

const ONES_EN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS_EN = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousandEn(n) {
  let s = '';
  if (n >= 100) {
    s += ONES_EN[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    s += TENS_EN[Math.floor(n / 10)] + ' ' + ONES_EN[n % 10];
  } else if (n > 0) {
    s += ONES_EN[n];
  }
  return s.trim();
}

function convertUnderThousandHi(n) {
  let s = '';
  if (n >= 100) {
    s += ONES_HI[Math.floor(n / 100)] + ' सौ ';
    n %= 100;
  }
  if (n > 0) {
    s += TWO_DIGITS_HI[n] || '';
  }
  return s.trim();
}

export function amountToWords(num, lang = 'hi') {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return lang === 'hi' ? 'रुपये शून्य मात्र' : 'Rupees Zero Only';

  if (lang === 'hi') {
    let rem = n;
    const parts = [];

    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    if (crore > 0) parts.push(`${convertUnderThousandHi(crore)} करोड़`);

    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    if (lakh > 0) parts.push(`${convertUnderThousandHi(lakh)} लाख`);

    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    if (thousand > 0) parts.push(`${convertUnderThousandHi(thousand)} हज़ार`);

    if (rem > 0) parts.push(convertUnderThousandHi(rem));

    return `रुपये ${parts.join(' ').trim()} मात्र`;
  } else {
    let rem = n;
    const parts = [];

    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    if (crore > 0) parts.push(`${convertUnderThousandEn(crore)} Crore`);

    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    if (lakh > 0) parts.push(`${convertUnderThousandEn(lakh)} Lakh`);

    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    if (thousand > 0) parts.push(`${convertUnderThousandEn(thousand)} Thousand`);

    if (rem > 0) parts.push(convertUnderThousandEn(rem));

    return `Rupees ${parts.join(' ').trim()} Only`;
  }
}

