function maskSensitiveData(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (data && data.data) {
      const maskEmail = (email) => {
        if (!email || typeof email !== 'string') return email;
        const [local, domain] = email.split('@');
        if (!domain) return email;
        const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
        return `${maskedLocal}@${domain}`;
      };
      const maskPhone = (phone) => {
        if (!phone || typeof phone !== 'string') return phone;
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 7) return phone;
        const start = cleaned.slice(0, 3);
        const end = cleaned.slice(-3);
        return `${start}******${end}`;
      };
      const maskValue = (val) => {
        if (typeof val === 'string') {
          if (val.includes('@')) return maskEmail(val);
          if (/^\+?\d{7,}$/.test(val.replace(/\s/g, ''))) return maskPhone(val);
        }
        return val;
      };

      const maskObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(maskObject);
        const masked = { ...obj };
        if (masked.email) masked.email = maskEmail(masked.email);
        if (masked.phone_number) masked.phone_number = maskPhone(masked.phone_number);
        if (masked.phone) masked.phone = maskPhone(masked.phone);
        if (masked.wallet_address) masked.wallet_address = maskValue(masked.wallet_address);
        Object.keys(masked).forEach(key => {
          if (masked[key] && typeof masked[key] === 'object') {
            masked[key] = maskObject(masked[key]);
          }
        });
        return masked;
      };

      data.data = maskObject(data.data);
    }
    return originalJson(data);
  };
  next();
}

module.exports = maskSensitiveData;
