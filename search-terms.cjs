const cp = require('child_process');
const terms = ['mock', 'demo', 'dummy', 'fake', 'sample', 'Test Product', 'Testville', '123 Test St', 'Assigned Shop', 'Rider Test', 'E2E Rider', 'Vikram', 'Rahul', 'Amit', 'PM-RIDER', 'Hero Electric', '28 km/h', '1.4 km', '5-8 min', '₹65', '₹10 Tip'];
const report = {};
terms.forEach(t => {
  try {
    const res = cp.execSync(`git grep -il "${t}"`, {encoding: 'utf8'});
    report[t] = res.trim().split('\n').filter(f => !f.includes('package-lock.json') && !f.includes('search-terms.js') && !f.includes('cleanup-test-data.ts'));
  } catch(e) {
    report[t] = [];
  }
});
console.log(JSON.stringify(report, null, 2));
