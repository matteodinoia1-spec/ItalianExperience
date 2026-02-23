import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function assertMatch(html, regex, label) {
  if (!regex.test(html)) {
    throw new Error(`Failed assertion "${label}" (${regex})`);
  }
}

const checks = [
  {
    file: 'index.html',
    rules: [
      { re: /hero-top-nav/, label: 'hero nav' },
      { re: /hero-portal-wrapper/, label: 'hero wrapper' },
      { re: /href="\/ItalianExperience\/travel\/"/, label: 'travel link' },
      { re: /href="\/ItalianExperience\/recruitment\/"/, label: 'recruitment link' }
    ]
  },
  {
    file: 'contact/index.html',
    rules: [
      { re: /id="contactForm"/, label: 'contact form id' },
      { re: /type="submit"/, label: 'submit button' },
      { re: /id="site-header"/, label: 'header mount' }
    ]
  },
  {
    file: 'travel/index.html',
    rules: [
      { re: /services-horizontal/, label: 'travel services container' },
      { re: /\/ItalianExperience\/travel\/bespoke\//, label: 'bespoke link' }
    ]
  },
  {
    file: 'recruitment/index.html',
    rules: [
      { re: /recruitment-wrapper/, label: 'recruitment wrapper' },
      { re: /I am an <br>Employer/, label: 'employer pillar' },
      { re: /I am a <br>Candidate/, label: 'candidate pillar' }
    ]
  },
  {
    file: 'flavors/index.html',
    rules: [
      { re: /hub-grid/, label: 'flavors hub grid' },
      { re: /for-your-home/, label: 'home link' },
      { re: /for-your-business/, label: 'business link' }
    ]
  },
  {
    file: 'partials/header.html',
    rules: [
      { re: /id="menu-toggle-btn"/, label: 'mobile menu button' },
      { re: /id="mobile-nav"/, label: 'mobile nav container' },
      { re: /accordion-toggle/, label: 'accordion toggles' }
    ]
  }
];

for (const check of checks) {
  const html = read(check.file);
  for (const rule of check.rules) {
    assertMatch(html, rule.re, `${check.file}: ${rule.label}`);
  }
  console.log(`OK: smoke ${check.file}`);
}

console.log('OK: smoke suite passed.');
