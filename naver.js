const puppeteer = require('puppeteer');

const CATEGORY_LIST = [
  'EXHIBIT',    // 전시
  'MUSICAL',    // 뮤지컬
  'CONCERT',    // 콘서트
  'DRAMA',      // 연극
  'CLASSIC',    // 클래식
  'KIDS'        // 키즈
];

async function query(options) {
  if (!page) {
    return;
  }

  const category = options && options.category ? options.category.toUpperCase() : null;
  const month = options && options.month ? options.month : 0;

  await page.goto('https://swindow.naver.com/art/external/booking', { waitUntil: 'networkidle2' });
  await page.click('#content .category_detail .select_depth:nth-of-type(3) li:nth-of-type(' + Number(month + 2) + ')');
  await page.click('#content .category_detail .select_depth:nth-of-type(2) li[data-exhibit-area-type="SE"]');
  if (category && CATEGORY_LIST.indexOf(category) >= 0) {
    await page.click('#content .category_detail .select_depth:nth-of-type(1) li[data-exhibit-type="' + category + '"]');
  }

  await page.waitForSelector('#grid li');

  const list = await page.$eval('#grid', e => {
    const result = [];
    const items = e.querySelectorAll('li');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const link = item.querySelector('a').getAttribute('href');
      const imgSrc = item.querySelector('.thumb img').getAttribute('src');
      const title = item.querySelector('.booking_info .tit').innerHTML;
      const place = item.querySelector('.booking_info .place').innerHTML;
      const duration = item.querySelector('.booking_info .duration').innerHTML;

      result.push({ link, title, place, duration, imgSrc });
    }
    return result;
  });

  return list;
}

let browser = null;
let page = null;

(async () => {
  browser = await puppeteer.launch();
  page = await browser.newPage();
})();


module.exports = {
  query
};
