import re
import logging

logger = logging.getLogger('security')

# Common SQL Injection patterns
SQL_INJECTION_PATTERNS = [
    r"(\%27)|(\')|(\-\-)|(\%23)|(#)", # Single quote, double dash, hash
    r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))", # = followed by ' or ; or --
    r"\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))", # ' or keyword
    r"((\%27)|(\'))union", # ' union
    r"exec(\s|\+)+(s|x)p\w+", # exec sp_ or xp_
    r"(\s|;)(drop|delete|update|insert|truncate|alter|create|select)\s", # SQL keywords
    r"/\*.*\*/", # Multi-line comments
]

def is_suspicious_string(value):
    """Detects if a string contains common SQL injection patterns."""
    if not isinstance(value, str):
        return False
    
    # Check against compiled patterns
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            return True
    return False

def sanitize_sql_input(value):
    """
    Sanitizes single strings by escaping single quotes and removing comments.
    This is a 'soft' sanitization.
    """
    if not isinstance(value, str):
        return value
    
    # Escape single quotes
    sanitized = value.replace("'", "''")
    
    # Remove single line comments
    sanitized = re.sub(r'--.*', '', sanitized)
    
    # Remove multi-line comments
    sanitized = re.sub(r'/\*.*?\*/', '', sanitized, flags=re.DOTALL)
    
    return sanitized

def validate_data_recursive(data):
    """Recursively validates a dictionary or list for suspicious patterns."""
    if isinstance(data, dict):
        for key, value in data.items():
            if validate_data_recursive(value):
                return True
    elif isinstance(data, list):
        for item in data:
            if validate_data_recursive(item):
                return True
    elif isinstance(data, str):
        if is_suspicious_string(data):
            logger.warning(f"Suspicious SQL pattern detected in input: {data}")
            return True
    return False
