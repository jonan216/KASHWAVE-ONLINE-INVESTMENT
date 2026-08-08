const { hashPassword } = require('../src/utils/hash');

(async () => {
  try {
    const hash = await hashPassword('TestPass123!');
    console.log('Hash generated successfully');
    console.log('Hash:', hash);
  } catch (e) {
    console.error('Hash error:', e.message);
  }
})();
