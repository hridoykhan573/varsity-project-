/**
 * SQL Injection Protection Utility for Node.js
 */

const SQL_INJECTION_PATTERNS = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /(\s|;)(drop|delete|update|insert|truncate|alter|create|select)\s/i,
    /\/\*.*?\*\//s
];

/**
 * Detects if a value contains suspicious SQL patterns.
 * @param {any} value 
 * @returns {boolean}
 */
const isSuspicious = (value) => {
    if (typeof value !== 'string') return false;
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
};

/**
 * Recursively scans an object for suspicious patterns.
 * @param {any} data 
 * @returns {boolean}
 */
const hasSuspiciousPatterns = (data) => {
    if (typeof data === 'string') {
        return isSuspicious(data);
    }
    if (Array.isArray(data)) {
        return data.some(hasSuspiciousPatterns);
    }
    if (typeof data === 'object' && data !== null) {
        return Object.values(data).some(hasSuspiciousPatterns);
    }
    return false;
};

/**
 * Express middleware to block SQL injection attempts.
 */
const sqlInjectionProtection = (req, res, next) => {
    const dataToScan = {
        body: req.body,
        query: req.query,
        params: req.params
    };

    if (hasSuspiciousPatterns(dataToScan)) {
        console.warn(`🚨 SECURITY ALERT: SQL Injection pattern blocked! | Path: ${req.path} | IP: ${req.ip}`);
        return res.status(400).json({
            error: 'Security alert: Suspicious input pattern detected.'
        });
    }

    next();
};

module.exports = {
    isSuspicious,
    hasSuspiciousPatterns,
    sqlInjectionProtection
};
