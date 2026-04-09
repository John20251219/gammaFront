// src/components/CommonFooter.jsx
import React from 'react';

const CommonFooter = ({ style, color = '#8c8c8c' }) => {
    const currentYear = new Date().getFullYear();
    const companyName = "深圳市伽玛消防设施工程有限公司."; // 公司名
    const icpNumber = "粤ICP备20046910号-2"; // 备案号

    return (
        <footer style={{
            textAlign: 'center',
            padding: '24px 0',
            color: color,
            fontSize: '14px',
            lineHeight: '1.5',
            ...style
        }}>
            <div>
                Copyright © {currentYear} {companyName} All Rights Reserved.
            </div>
            <div>
                <a
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: color, textDecoration: 'none' }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                    {icpNumber}
                </a>
            </div>
        </footer>
    );
};

export default CommonFooter;