const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LESSONS_URL = 'https://obs.itu.edu.tr/public/DersProgram';

async function fetchLessons() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to lessons page...');
  await page.goto(LESSONS_URL, { waitUntil: 'networkidle2' });

  // Switch to Turkish if needed
  try {
    const langButton = await page.$('a.menu-lang');
    if (langButton) {
      const langText = await page.evaluate(el => el.innerHTML, langButton);
      if (langText.includes('TÜRKÇE')) {
        console.log('Switching to Turkish...');
        await langButton.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch (e) {
    console.log('Language switch not needed or failed:', e.message);
  }

  // Select undergraduate
  try {
    await page.select('select[name="programSeviyeTipi"]', 'LS');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('Program level select failed:', e.message);
  }

  // Get all course options
  const courseOptions = await page.$$eval('select[name="dersKodu"] option', options =>
    options.map(option => ({ value: option.value, text: option.text.trim() })).filter(opt => opt.value && opt.text !== 'Ders Kodu Seçiniz')
  );

  console.log(`Found ${courseOptions.length} courses to scrape`);

  const lessons = [];

  for (let i = 0; i < Math.min(courseOptions.length, 5); i++) { // Limit for testing
    const course = courseOptions[i];
    console.log(`Scraping ${course.text}...`);

    try {
      // Select course
      await page.select('select[name="dersKodu"]', course.value);

      // Click submit
      const submitButton = await page.$('input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }

      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Extract table rows
      const rows = await page.$$eval('table tr', trs =>
        trs.map(tr => {
          const tds = tr.querySelectorAll('td');
          return Array.from(tds).map(td => td.innerHTML.trim());
        }).filter(row => row.length > 0 && !row[0].includes('table-baslik'))
      );

      lessons.push(...rows);

    } catch (e) {
      console.log(`Failed to scrape ${course.text}:`, e.message);
    }
  }

  await browser.close();

  // Save to file
  const outputPath = path.join(__dirname, '..', 'data', 'lessons.psv');
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  const content = lessons.map(row => row.join('|')).join('\n') + '\n';
  fs.writeFileSync(outputPath, content, 'utf-8');

  console.log(`Saved ${lessons.length} lessons to ${outputPath}`);
}

async function main() {
  try {
    await fetchLessons();
    console.log('Data fetching completed successfully');
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchLessons };